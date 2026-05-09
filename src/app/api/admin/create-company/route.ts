import { NextResponse } from 'next/server';
import admin from '@/firebase/admin-config';
import { z } from 'zod';
import { resolveClaForBusiness } from '@/lib/business/cct-resolution';

const createCompanySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  companyName: z.string().min(1),
  canton: z.string().optional(),
  industry: z.string().optional(),
  type: z.enum(['business', 'accounting_firm']),
  accountingFirmId: z.string().nullable().optional(),
});


export async function POST(request: Request) {
  try {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createCompanySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', issues: validation.error.issues }, { status: 400 });
    }
    const { email, password, firstName, lastName, phone, companyName, canton, industry, type, accountingFirmId } = validation.data;

    if (type === 'business' && !industry) {
      return NextResponse.json({ error: 'Industry is required for business companies.' }, { status: 400 });
    }

    const claResolution = type === 'business' && industry ? resolveClaForBusiness(industry, canton) : null;
    const selectedCla = claResolution?.cla ?? null;

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role: type });
    
    const companyDocRef = admin.firestore().collection('companies').doc();
    await companyDocRef.set({
        companyName,
        adminUserId: userRecord.uid,
        type,
        status: 'active',
        profileCompleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        canton: canton || null,
        industry: industry || null,
        phone: phone || null,
        accountingFirmId: accountingFirmId || null,
        cla: selectedCla ? {
          id: selectedCla.id,
          name: selectedCla.name,
          nameFr: selectedCla.nameFr,
          minimumMonthlyWage: selectedCla.minimumMonthlyWage,
          minimumHourlyWage: selectedCla.minimumHourlyWage,
          noticePeriods: selectedCla.noticePeriods,
          wagesByRole: selectedCla.wagesByRole,
          cctUrl: selectedCla.cctUrl,
          legalBasis: selectedCla.legalBasis,
        } : null,
        claSelectionMeta: claResolution ? {
          matchType: claResolution.matchType,
          matchedAlias: claResolution.matchedAlias,
          sourceField: 'industry+canton',
          sourceValue: industry,
          canton: claResolution.canton,
          cantonOverrideApplied: claResolution.cantonOverrideApplied,
        } : null,
    });

    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
    await userDocRef.set({
        email,
        role: type,
        companyId: companyDocRef.id,
        profile: { firstName, lastName, phone },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
    });
    
    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      companyId: companyDocRef.id,
      claSelection: claResolution ? {
        id: claResolution.cla.id,
        name: claResolution.cla.name,
        matchType: claResolution.matchType,
      } : null,
    });

  } catch (error: any) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
