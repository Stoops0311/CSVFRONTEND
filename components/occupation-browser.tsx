'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ChevronDown, Briefcase, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Occupation, OccupationGroup } from '@/lib/types';
import { loadOccupations, organizeOccupations } from '@/lib/occupations';

export default function OccupationBrowser() {
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOccupation, setSelectedOccupation] = useState<Occupation | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOccupations().then(data => {
      setOccupations(data);
      setLoading(false);
    });
  }, []);

  const filteredOccupations = useMemo(() => {
    if (!searchTerm) return occupations;
    
    const term = searchTerm.toLowerCase();
    return occupations.filter(occ => 
      occ.preferredLabel?.toLowerCase().includes(term) ||
      occ.code?.toLowerCase().includes(term) ||
      occ.coreDescription?.toLowerCase().includes(term) ||
      occ.exampleAlternateDesignation?.toLowerCase().includes(term)
    );
  }, [occupations, searchTerm]);

  const organizedOccupations = useMemo(() => {
    return organizeOccupations(filteredOccupations);
  }, [filteredOccupations]);

  const toggleGroup = (code: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const renderGroup = (group: OccupationGroup, level: number = 0) => {
    const isExpanded = expandedGroups.has(group.code);
    const hasChildren = group.children.length > 0;
    
    return (
      <div key={group.code} className="w-full">
        <div
          className={`flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer ${
            level === 0 ? 'font-semibold' : level === 1 ? 'font-medium' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => toggleGroup(group.code)}
        >
          {hasChildren && (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          )}
          {!hasChildren && <div className="w-4" />}
          <span className="text-sm">
            {group.code} - {group.name}
          </span>
        </div>
        {isExpanded && (
          <div>
            {group.children.map(child => {
              if ('children' in child) {
                return renderGroup(child as OccupationGroup, level + 1);
              } else {
                return renderOccupation(child as Occupation, level + 1);
              }
            })}
          </div>
        )}
      </div>
    );
  };

  const renderOccupation = (occupation: Occupation, level: number) => {
    const isSelected = selectedOccupation?.keyId === occupation.keyId;
    
    return (
      <div
        key={occupation.keyId}
        className={`flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer ${
          isSelected ? 'bg-accent' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 32}px` }}
        onClick={() => setSelectedOccupation(occupation)}
      >
        <Briefcase className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm">
          {occupation.code} - {occupation.preferredLabel}
        </span>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-1/3 min-w-[350px] border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search occupations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading occupations...</div>
            ) : organizedOccupations.length > 0 ? (
              organizedOccupations.map(group => renderGroup(group))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No occupations found matching &quot;{searchTerm}&quot;
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 overflow-auto">
        {selectedOccupation ? (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">{selectedOccupation.preferredLabel}</h1>
                <p className="text-muted-foreground mt-1">Code: {selectedOccupation.code}</p>
              </div>
              {selectedOccupation.status && (
                <Badge variant={selectedOccupation.status === 'Released' ? 'default' : 'secondary'}>
                  {selectedOccupation.status}
                </Badge>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{selectedOccupation.coreDescription}</p>
              </CardContent>
            </Card>

            {selectedOccupation.definition && (
              <Card>
                <CardHeader>
                  <CardTitle>Definition</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{selectedOccupation.definition}</p>
                </CardContent>
              </Card>
            )}

            {selectedOccupation.scopeNote && (
              <Card>
                <CardHeader>
                  <CardTitle>Scope Note</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{selectedOccupation.scopeNote}</p>
                </CardContent>
              </Card>
            )}

            {selectedOccupation.exampleAlternateDesignation && (
              <Card>
                <CardHeader>
                  <CardTitle>Alternative Labels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedOccupation.exampleAlternateDesignation
                      .split('\n')
                      .filter(label => label.trim())
                      .map((label, index) => (
                        <Badge key={index} variant="outline">
                          {label.trim()}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedOccupation.iscoGroupCode && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-sm">ISCO Group Code:</span>
                    <span className="text-sm">{selectedOccupation.iscoGroupCode}</span>
                  </div>
                )}
                {selectedOccupation.occupationType && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-sm">Occupation Type:</span>
                    <span className="text-sm">{selectedOccupation.occupationType}</span>
                  </div>
                )}
                {selectedOccupation.regulatedProfessionNote && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-sm">Regulated Profession:</span>
                    <span className="text-sm">{selectedOccupation.regulatedProfessionNote}</span>
                  </div>
                )}
                {selectedOccupation.keyId && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-sm">Key ID:</span>
                    <span className="text-sm">{selectedOccupation.keyId}</span>
                  </div>
                )}
                {selectedOccupation.userLink && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-sm">Reference:</span>
                    <a 
                      href={selectedOccupation.userLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View on ESCO
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <Info className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">Select an occupation</h2>
              <p className="text-muted-foreground max-w-sm">
                Browse or search for occupations in the sidebar to view detailed information
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}