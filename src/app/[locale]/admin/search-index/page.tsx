'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/firebase-provider';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { buildSearchIndex, type SearchIndex, type IndexedChunk, fastSearch } from '@/lib/legal-assistant-search-index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, Download, Upload, Trash2, Search, FileText, Tag, Clock, Database, CheckCircle, XCircle } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

type IndexStats = {
  totalKeywords: number;
  totalChunks: number;
  lastBuilt: Date | null;
  status: 'ready' | 'building' | 'error' | 'empty';
};

export default function SearchIndexPage() {
  const { user } = useFirebase();
  const locale = useLocale();
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [stats, setStats] = useState<IndexStats>({
    totalKeywords: 0,
    totalChunks: 0,
    lastBuilt: null,
    status: 'empty',
  });
  const [isBuilding, setIsBuilding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ documentId: string; title: string; chunkId: string; text: string; score: number }>>([]);
  const [selectedChunk, setSelectedChunk] = useState<IndexedChunk | null>(null);

  const buildIndex = async () => {
    if (!user) return;
    setIsBuilding(true);
    setStats(prev => ({ ...prev, status: 'building' }));

    try {
      const docSnapshots = await getDocs(query(collection(firestore, 'legal_documents'), where('status', '==', 'Indexed')));
      const documents = await Promise.all(
        docSnapshots.docs.map(async (docSnap) => {
          const docData = docSnap.data();
          const chunksSnapshot = await getDocs(collection(docSnap.ref, 'chunks'));
          const chunks = chunksSnapshot.docs.map(chunkSnap => ({
            chunkId: chunkSnap.id,
            text: chunkSnap.data().text,
            docCanton: docData.canton,
          }));
          return { documentId: docSnap.id, title: docData.title, chunks };
        })
      );

      const index = await buildSearchIndex(() => Promise.resolve(documents));
      setSearchIndex(index);

      const keywordCount = Object.keys(index.keywordToChunks).length;
      const chunkCount = Object.keys(index.chunks).length;

      setStats({
        totalKeywords: keywordCount,
        totalChunks: chunkCount,
        lastBuilt: new Date(),
        status: 'ready',
      });
    } catch (error) {
      console.error('Failed to build index:', error);
      setStats(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsBuilding(false);
    }
  };

  useEffect(() => {
    if (user) {
      buildIndex();
    }
  }, [user]);

  const handleSearch = () => {
    if (!searchIndex || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results = fastSearch(searchIndex, searchQuery, { limit: 10 });
    setSearchResults(results);
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery, searchIndex]);

  const exportIndex = () => {
    if (!searchIndex) return;
    const dataStr = JSON.stringify(searchIndex, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `search-index-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getChunkIds = (keyword: string): string[] => {
    return searchIndex?.keywordToChunks[keyword] || [];
  };

  const getChunkFromIdString = (chunkIdStr: string): IndexedChunk | undefined => {
    return searchIndex?.chunks[chunkIdStr];
  };

  const keywordList = searchIndex ? Object.keys(searchIndex.keywordToChunks).slice(0, 100) : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Search Index Viewer</h1>
          <p className="text-muted-foreground">View and manage the legal assistant search index</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKeywords.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChunks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Built</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {formatTimeAgo(stats.lastBuilt)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={stats.status === 'ready' ? 'default' : stats.status === 'building' ? 'secondary' : 'destructive'}>
              {stats.status === 'ready' && <CheckCircle className="h-3 w-3 mr-1" />}
              {stats.status === 'building' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {stats.status === 'error' && <XCircle className="h-3 w-3 mr-1" />}
              {stats.status.charAt(0).toUpperCase() + stats.status.slice(1)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={buildIndex} disabled={isBuilding}>
              {isBuilding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Rebuild
            </Button>
            <Button variant="outline" onClick={exportIndex} disabled={!searchIndex}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Chunk</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((result, idx) => {
                  const chunkKey = `${result.documentId}_${result.chunkId}`;
                  const chunk = getChunkFromIdString(chunkKey);
                  return (
                  <TableRow key={idx} className="cursor-pointer" onClick={() => chunk && setSelectedChunk(chunk)}>
                    <TableCell className="font-medium">{result.title}</TableCell>
                    <TableCell className="text-muted-foreground">{result.chunkId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{result.score}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{result.text.substring(0, 100)}...</TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="keywords" className="w-full">
        <TabsList>
          <TabsTrigger value="keywords">
            <Tag className="h-4 w-4 mr-2" />
            Keywords ({keywordList.length})
          </TabsTrigger>
          <TabsTrigger value="chunks">
            <FileText className="h-4 w-4 mr-2" />
            Document Chunks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keywords">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Chunk IDs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywordList.map((keyword) => (
                    <TableRow key={keyword}>
                      <TableCell className="font-mono font-medium">{keyword}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getChunkIds(keyword).length}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {getChunkIds(keyword).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chunks">
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Title</TableHead>
                      <TableHead>Chunk ID</TableHead>
                      <TableHead>Canton</TableHead>
                      <TableHead>Keywords</TableHead>
                      <TableHead>Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchIndex ? Object.entries(searchIndex.chunks).slice(0, 50).map(([chunkId, chunk]) => (
                      <TableRow key={chunkId} className="cursor-pointer" onClick={() => setSelectedChunk(chunk)}>
                        <TableCell className="font-medium">{chunk.title}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{chunk.chunkId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{chunk.docCanton}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {chunk.keywords.slice(0, 5).map(kw => (
                              <Badge key={kw} variant="secondary" className="text-[10px]">{kw}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {chunk.text.substring(0, 80)}...
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No chunks loaded. Build the index first.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chunk Detail Dialog */}
      {selectedChunk && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{selectedChunk.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="outline">{selectedChunk.docCanton}</Badge>
                <Badge variant="outline">{selectedChunk.chunkId}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedChunk.keywords.map(kw => (
                  <Badge key={kw} variant="secondary">{kw}</Badge>
                ))}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{selectedChunk.text}</pre>
              </div>
              <Button variant="outline" onClick={() => setSelectedChunk(null)}>Close</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}