'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ChevronDown, Briefcase, Info, X, Filter } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Occupation, OccupationGroup } from '@/lib/types';
import { loadOccupations, organizeOccupations } from '@/lib/occupations';
import { EnhancedSearchEngine, SearchResult, SearchFilters } from '@/lib/search';
import { useDebouncedSearch } from '@/lib/hooks/useDebounce';
import { SearchResults } from '@/components/search-results';

export default function OccupationBrowser() {
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOccupation, setSelectedOccupation] = useState<Occupation | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchEngine, setSearchEngine] = useState<EnhancedSearchEngine | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    iscoMajorGroups: [],
    occupationTypes: []
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const { debouncedSearchTerm, isSearching } = useDebouncedSearch(searchTerm);

  useEffect(() => {
    loadOccupations().then(data => {
      setOccupations(data);
      const engine = new EnhancedSearchEngine(data);
      setSearchEngine(engine);
      setLoading(false);
    });
  }, []);

  // Enhanced search results
  const searchResults = useMemo(() => {
    if (!searchEngine || !debouncedSearchTerm.trim()) {
      return [];
    }
    return searchEngine.search(debouncedSearchTerm, searchFilters, 50);
  }, [searchEngine, debouncedSearchTerm, searchFilters]);

  // Tree view for browsing (when not searching)
  const organizedOccupations = useMemo(() => {
    if (debouncedSearchTerm.trim()) return [];
    return organizeOccupations(occupations);
  }, [occupations, debouncedSearchTerm]);

  // Available filters
  const availableFilters = useMemo(() => {
    return searchEngine?.getAvailableFilters() || { iscoMajorGroups: [], occupationTypes: [] };
  }, [searchEngine]);

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

  const clearSearch = () => {
    setSearchTerm('');
    setSearchFilters({ iscoMajorGroups: [], occupationTypes: [] });
    setShowFilters(false);
  };

  const handleSelectOccupation = (occupation: Occupation | SearchResult) => {
    setSelectedOccupation(occupation);
  };

  const toggleFilter = (type: 'iscoMajorGroups' | 'occupationTypes', value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  // Determine if we're in search mode
  const isSearchMode = debouncedSearchTerm.trim().length > 0;
  const resultCount = isSearchMode ? searchResults.length : organizedOccupations.length;

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
        onClick={() => handleSelectOccupation(occupation)}
      >
        <Briefcase className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm">
          {occupation.code} - {occupation.preferredLabel}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header - Top Section */}
      <div className="bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <Image 
            src="/ec-logo.png" 
            alt="European Commission" 
            width={300} 
            height={70}
            className="object-contain"
          />
          <div className="flex items-center gap-2">
            <div className="w-8 h-6 rounded flex items-center justify-center" style={{backgroundColor: '#004593'}}>
              <span className="text-white text-xs font-bold">EN</span>
            </div>
            <span className="font-medium" style={{color: '#004593'}}>English</span>
          </div>
        </div>
      </div>
      
      {/* Blue Header Section */}
      <div className="text-white" style={{backgroundColor: '#004593'}}>
        <div className="px-6 py-6">
          <h1 className="text-2xl font-bold text-center">European Skills, Competences, Qualifications and Occupations (ESCO)</h1>
        </div>
        
        {/* Navigation Menu */}
        <div className="px-6" style={{backgroundColor: '#003875'}}>
          <div className="flex items-center gap-8 py-3">
            <button className="text-white hover:text-blue-200 transition-colors font-medium">Home</button>
            <button className="text-white hover:text-blue-200 transition-colors font-medium flex items-center gap-1">
              About ESCO
              <span className="text-xs">▼</span>
            </button>
            <button className="text-white hover:text-blue-200 transition-colors font-medium flex items-center gap-1">
              Classification
              <span className="text-xs">▼</span>
            </button>
            <button className="text-white hover:text-blue-200 transition-colors font-medium flex items-center gap-1">
              Use ESCO
              <span className="text-xs">▼</span>
            </button>
            <button className="text-white hover:text-blue-200 transition-colors font-medium">News & Events</button>
            <button className="text-white hover:text-blue-200 transition-colors font-medium">Get in touch</button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-1/3 min-w-[350px] border-r flex flex-col overflow-hidden">
          <div className="p-4 border-b flex-shrink-0 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search occupations (try 'software engineer', 'manager', etc.)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-20"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search Stats and Filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">
                  {loading ? (
                    'Loading...'
                  ) : isSearching ? (
                    'Searching...'
                  ) : (
                    <>
                      {resultCount.toLocaleString()} {resultCount === 1 ? 'occupation' : 'occupations'}
                      {isSearchMode && (
                        <span className="text-green-600 ml-1">found</span>
                      )}
                    </>
                  )}
                </div>
                {isSearchMode && (
                  <Badge variant={isSearching ? "secondary" : "default"} className="text-xs">
                    {isSearching ? 'Searching...' : 'Search Results'}
                  </Badge>
                )}
              </div>
              
              {isSearchMode && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                    showFilters 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  Filters
                  {(searchFilters.iscoMajorGroups.length + searchFilters.occupationTypes.length) > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      {searchFilters.iscoMajorGroups.length + searchFilters.occupationTypes.length}
                    </Badge>
                  )}
                </button>
              )}
            </div>

            {/* Filter Panel */}
            {showFilters && isSearchMode && (
              <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
                {/* ISCO Major Groups */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">ISCO Major Groups</h4>
                  <div className="flex flex-wrap gap-1">
                    {availableFilters.iscoMajorGroups.map(group => (
                      <button
                        key={group}
                        onClick={() => toggleFilter('iscoMajorGroups', group)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          searchFilters.iscoMajorGroups.includes(group)
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {group} - {getMajorGroupName(group)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occupation Types */}
                {availableFilters.occupationTypes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Occupation Types</h4>
                    <div className="max-h-24 overflow-y-auto">
                      <div className="flex flex-wrap gap-1">
                        {availableFilters.occupationTypes.slice(0, 10).map(type => (
                          <button
                            key={type}
                            onClick={() => toggleFilter('occupationTypes', type)}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              searchFilters.occupationTypes.includes(type)
                                ? 'bg-green-100 text-green-700 border-green-300'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                        {availableFilters.occupationTypes.length > 10 && (
                          <span className="text-xs text-gray-500 px-2 py-1">
                            +{availableFilters.occupationTypes.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
                {(searchFilters.iscoMajorGroups.length + searchFilters.occupationTypes.length) > 0 && (
                  <button
                    onClick={() => setSearchFilters({ iscoMajorGroups: [], occupationTypes: [] })}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
          
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="h-full">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading occupations...</div>
              ) : isSearchMode ? (
                <SearchResults
                  results={searchResults}
                  onSelectOccupation={handleSelectOccupation}
                  selectedOccupationId={selectedOccupation?.keyId}
                  isLoading={isSearching}
                />
              ) : (
                <div className="p-2">
                  {organizedOccupations.length > 0 ? (
                    organizedOccupations.map(group => renderGroup(group))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No occupations available
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto">
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
                {selectedOccupation.iscoTaxIncluded && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-sm">ISCO Task Included:</span>
                    <span className="text-sm whitespace-pre-wrap">{selectedOccupation.iscoTaxIncluded}</span>
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
    </div>
  );
}

// Helper function for major group names
function getMajorGroupName(code: string): string {
  const names: Record<string, string> = {
    '0': 'Armed forces',
    '1': 'Managers',
    '2': 'Professionals',
    '3': 'Technicians',
    '4': 'Clerical support',
    '5': 'Service & sales',
    '6': 'Agricultural',
    '7': 'Craft workers',
    '8': 'Machine operators',
    '9': 'Elementary'
  };
  return names[code] || `Group ${code}`;
}