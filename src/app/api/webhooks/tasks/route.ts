import { NextRequest, NextResponse } from 'next/server';
import admin, { ensureAdminInitialized } from '@/firebase/admin-config';

/**
 * Webhook endpoint for third-party task management integrations.
 * Supports: Asana, Trello, Monday.com
 * 
 * This endpoint allows external task management tools to:
 * 1. Create tasks for accounting firm clients
 * 2. Update task status
 * 3. Sync task completion
 * 
 * Authentication: API key in header (X-API-Key) 
 * or signature verification for each platform.
 */

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'pending' | 'in-progress' | 'completed';

interface WebhookPayload {
  platform: 'asana' | 'trello' | 'monday' | 'generic';
  action: 'create' | 'update' | 'complete' | 'delete';
  task?: {
    externalId?: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    status?: TaskStatus;
  };
  firmId?: string;
  companyId?: string;
  apiKey?: string;
}

// Validate API key for firm
async function validateApiKey(apiKey: string, firmId: string): Promise<boolean> {
  if (!apiKey || !firmId) return false;
  
  await ensureAdminInitialized();
  const db = admin.firestore();
  
  const firmDoc = await db.collection('companies').doc(firmId).get();
  if (!firmDoc.exists) return false;
  
  const firmData = firmDoc.data();
  // Check if firm has this API key registered for integrations
  const integrations = firmData?.integrations || {};
  const storedApiKey = integrations.apiKey || integrations.webhookApiKey;
  
  if (!storedApiKey) {
    // Allow firms without configured API keys to use a fallback validation
    // In production, you might want to enforce API key configuration
    console.warn(`Firm ${firmId} has no API key configured for webhook integrations`);
    return false;
  }
  
  return storedApiKey === apiKey;
}

// Parse Asana webhook payload
function parseAsanaPayload(body: Record<string, unknown>): WebhookPayload {
  const events = body.events as Array<Record<string, unknown>> || [];
  if (events.length === 0) {
    return { platform: 'asana', action: 'create', task: { title: '' } };
  }
  
  const event = events[0];
  const resource = event.resource as Record<string, unknown> || {};
  const action = event.action as string;
  
  let mappedAction: WebhookPayload['action'] = 'create';
  if (action === 'changed' || action === 'changed') mappedAction = 'update';
  if (action === 'deleted') mappedAction = 'delete';
  
  return {
    platform: 'asana',
    action: mappedAction,
    task: {
      externalId: resource.gid as string,
      title: resource.name as string || 'Untitled Task',
      description: resource.notes as string,
      dueDate: resource.due_on as string,
    },
    firmId: (body.firmId || body.firm_id) as string,
    companyId: (body.companyId || body.company_id) as string,
  };
}

// Parse Trello webhook payload
function parseTrelloPayload(body: Record<string, unknown>): WebhookPayload {
  const action = body.action as Record<string, unknown> || {};
  const card = action.data as Record<string, unknown>;
  const cardData = card?.card as Record<string, unknown>;
  const actionType = action.type as string;
  
  let mappedAction: WebhookPayload['action'] = 'create';
  if (actionType === 'updateCard') mappedAction = 'update';
  if (actionType === 'deleteCard') mappedAction = 'delete';
  
  return {
    platform: 'trello',
    action: mappedAction,
    task: {
      externalId: cardData?.id as string,
      title: cardData?.name as string || 'Untitled Task',
      description: cardData?.desc as string,
      dueDate: cardData?.due as string,
    },
    firmId: (body.firmId || body.firm_id) as string,
    companyId: (body.companyId || body.company_id) as string,
  };
}

// Parse Monday.com webhook payload
function parseMondayPayload(body: Record<string, unknown>): WebhookPayload {
  const event = body.event as Record<string, unknown> || {};
  const pulseId = event.pulseId as string;
  const pulseName = event.pulseName as string;
  const eventType = event.type as string;
  
  let mappedAction: WebhookPayload['action'] = 'create';
  if (eventType === 'update_pulse') mappedAction = 'update';
  if (eventType === 'delete_pulse') mappedAction = 'delete';
  
  return {
    platform: 'monday',
    action: mappedAction,
    task: {
      externalId: pulseId,
      title: pulseName || 'Untitled Task',
      description: event.columnValues as string,
    },
    firmId: (body.firmId || body.firm_id) as string,
    companyId: (body.companyId || body.company_id) as string,
  };
}

// Parse generic webhook payload
function parseGenericPayload(body: Record<string, unknown>): WebhookPayload {
  return {
    platform: 'generic',
    action: (body.action as WebhookPayload['action']) || 'create',
    task: {
      externalId: body.externalId as string,
      title: (body.title || body.name || 'Untitled Task') as string,
      description: body.description as string,
      priority: body.priority as TaskPriority,
      dueDate: body.dueDate as string,
      status: body.status as TaskStatus,
    },
    firmId: (body.firmId || body.firm_id) as string,
    companyId: (body.companyId || body.company_id) as string,
    apiKey: (body.apiKey || body.api_key) as string,
  };
}

// Map priority from external format to internal
function mapPriority(priority?: string): TaskPriority {
  if (!priority) return 'medium';
  const p = priority.toLowerCase();
  if (p.includes('low')) return 'low';
  if (p.includes('high') || p.includes('critical')) return 'high';
  if (p.includes('urgent')) return 'urgent';
  return 'medium';
}

export async function POST(request: NextRequest) {
  try {
    await ensureAdminInitialized();
    const db = admin.firestore();
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
    
    const body = await request.json();
    const platform = (body.platform || body.source || 'generic') as string;
    
    // Parse webhook payload based on platform
    let payload: WebhookPayload;
    switch (platform.toLowerCase()) {
      case 'asana':
        payload = parseAsanaPayload(body);
        break;
      case 'trello':
        payload = parseTrelloPayload(body);
        break;
      case 'monday':
        payload = parseMondayPayload(body);
        break;
      default:
        payload = parseGenericPayload(body);
    }
    
    // Validate required fields
    if (!payload.firmId) {
      return NextResponse.json(
        { error: 'Missing firmId', message: 'firmId is required to identify the accounting firm' },
        { status: 400 }
      );
    }
    
    if (!payload.companyId) {
      return NextResponse.json(
        { error: 'Missing companyId', message: 'companyId is required to identify the client company' },
        { status: 400 }
      );
    }
    
    // Validate API key
    const apiKey = request.headers.get('X-API-Key') || payload.apiKey || '';
    const isValid = await validateApiKey(apiKey, payload.firmId);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing API key' },
        { status: 401 }
      );
    }
    
    // Verify firm owns this client
    const clientDoc = await db.collection('companies').doc(payload.companyId).get();
    if (!clientDoc.exists) {
      return NextResponse.json(
        { error: 'Client not found', message: 'The specified client company does not exist' },
        { status: 404 }
      );
    }
    
    const clientData = clientDoc.data();
    if (clientData?.accountingFirmId !== payload.firmId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'This client is not assigned to your firm' },
        { status: 403 }
      );
    }
    
    const clientName = clientData?.name || clientData?.companyName || 'Unknown Client';
    
    // Handle different actions
    switch (payload.action) {
      case 'create': {
        if (!payload.task?.title) {
          return NextResponse.json(
            { error: 'Missing title', message: 'Task title is required' },
            { status: 400 }
          );
        }
        
        const taskRef = await db.collection('accounting_firm_tasks').add({
          title: payload.task.title,
          description: payload.task.description || '',
          companyId: payload.companyId,
          companyName: clientName,
          firmId: payload.firmId,
          priority: mapPriority(payload.task.priority),
          status: payload.task.status || 'pending',
          dueDate: payload.task.dueDate || '',
          externalId: payload.task.externalId,
          externalPlatform: payload.platform,
          createdAt: serverTimestamp(),
          source: `webhook_${payload.platform}`,
        });
        
        return NextResponse.json({
          success: true,
          action: 'create',
          taskId: taskRef.id,
          message: 'Task created successfully',
        });
      }
      
      case 'update': {
        if (!payload.task?.externalId) {
          return NextResponse.json(
            { error: 'Missing externalId', message: 'External task ID is required for updates' },
            { status: 400 }
          );
        }
        
        // Find task by external ID
        const tasksQuery = await db
          .collection('accounting_firm_tasks')
          .where('firmId', '==', payload.firmId)
          .where('externalId', '==', payload.task.externalId)
          .limit(1)
          .get();
        
        if (tasksQuery.empty) {
          return NextResponse.json(
            { error: 'Task not found', message: 'No task found with the given external ID' },
            { status: 404 }
          );
        }
        
        const taskDoc = tasksQuery.docs[0];
        const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() };
        if (payload.task.title) updateData.title = payload.task.title;
        if (payload.task.description) updateData.description = payload.task.description;
        if (payload.task.priority) updateData.priority = mapPriority(payload.task.priority);
        if (payload.task.status) updateData.status = payload.task.status;
        if (payload.task.dueDate) updateData.dueDate = payload.task.dueDate;
        
        await taskDoc.ref.update(updateData);
        
        return NextResponse.json({
          success: true,
          action: 'update',
          taskId: taskDoc.id,
          message: 'Task updated successfully',
        });
      }
      
      case 'complete': {
        if (!payload.task?.externalId) {
          return NextResponse.json(
            { error: 'Missing externalId', message: 'External task ID is required' },
            { status: 400 }
          );
        }
        
        const tasksQuery = await db
          .collection('accounting_firm_tasks')
          .where('firmId', '==', payload.firmId)
          .where('externalId', '==', payload.task.externalId)
          .limit(1)
          .get();
        
        if (tasksQuery.empty) {
          return NextResponse.json(
            { error: 'Task not found', message: 'No task found with the given external ID' },
            { status: 404 }
          );
        }
        
        const taskDoc = tasksQuery.docs[0];
        await taskDoc.ref.update({
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        return NextResponse.json({
          success: true,
          action: 'complete',
          taskId: taskDoc.id,
          message: 'Task marked as completed',
        });
      }
      
      case 'delete': {
        if (!payload.task?.externalId) {
          return NextResponse.json(
            { error: 'Missing externalId', message: 'External task ID is required' },
            { status: 400 }
          );
        }
        
        const tasksQuery = await db
          .collection('accounting_firm_tasks')
          .where('firmId', '==', payload.firmId)
          .where('externalId', '==', payload.task.externalId)
          .limit(1)
          .get();
        
        if (tasksQuery.empty) {
          return NextResponse.json({
            success: true,
            action: 'delete',
            message: 'Task already deleted or not found',
          });
        }
        
        const taskDoc = tasksQuery.docs[0];
        await taskDoc.ref.delete();
        
        return NextResponse.json({
          success: true,
          action: 'delete',
          taskId: taskDoc.id,
          message: 'Task deleted successfully',
        });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action', message: `Unknown action: ${payload.action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Handle Asana webhook handshake (X-Hook-Secret challenge)
export async function GET(request: NextRequest) {
  const hookSecret = request.headers.get('X-Hook-Secret');
  
  if (hookSecret) {
    // Asana webhook verification handshake
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Hook-Secret': hookSecret,
      },
    });
  }
  
  // Return endpoint info for other GET requests
  return NextResponse.json({
    name: 'Lynvia Task Integration Webhook',
    version: '1.0.0',
    supported_platforms: ['asana', 'trello', 'monday', 'generic'],
    supported_actions: ['create', 'update', 'complete', 'delete'],
    documentation: 'https://docs.lynvia.com/integrations/webhooks',
  });
}
