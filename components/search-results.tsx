import { Briefcase, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SearchResult } from '@/lib/search';

interface SearchResultsProps {
  results: SearchResult[];
  onSelectOccupation: (occupation: SearchResult) => void;
  selectedOccupationId?: string;
  isLoading?: boolean;
}

export function SearchResults({ 
  results, 
  onSelectOccupation, 
  selectedOccupationId,
  isLoading = false 
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <Card className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                <div className="h-3 bg-gray-100 rounded w-full"></div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Briefcase className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No occupations found</h3>
        <p className="text-gray-500 max-w-sm">
          Try adjusting your search terms or filters to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {results.map((result) => (
        <SearchResultCard
          key={result.keyId}
          result={result}
          isSelected={selectedOccupationId === result.keyId}
          onClick={() => onSelectOccupation(result)}
        />
      ))}
    </div>
  );
}

interface SearchResultCardProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
}

function SearchResultCard({ result, isSelected, onClick }: SearchResultCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-blue-500 bg-blue-50' 
          : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <Briefcase className="h-4 w-4 text-gray-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Main Title */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 leading-tight">
                <HighlightedText 
                  text={result.preferredLabel || 'Unknown Occupation'} 
                  matches={getMatchesForField(result.matches, 'preferredLabel')}
                />
              </h3>
              {result.score && (
                <div className="flex-shrink-0">
                  <Badge 
                    variant="outline" 
                    className="text-xs font-mono"
                    style={{ backgroundColor: getRelevanceColor(result.score) }}
                  >
                    {Math.round(result.score * 100)}%
                  </Badge>
                </div>
              )}
            </div>

            {/* Code */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="font-mono text-xs">
                <HighlightedText 
                  text={result.code || 'N/A'} 
                  matches={getMatchesForField(result.matches, 'code')}
                />
              </Badge>
              {result.occupationType && (
                <Badge variant="outline" className="text-xs">
                  {result.occupationType}
                </Badge>
              )}
            </div>

            {/* Breadcrumb */}
            {result.breadcrumb && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                <span>Path:</span>
                <div className="flex items-center gap-1">
                  {result.breadcrumb.split(' > ').map((crumb, index, array) => (
                    <div key={index} className="flex items-center gap-1">
                      <span className="font-medium">{crumb}</span>
                      {index < array.length - 1 && (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="text-sm text-gray-700 line-clamp-2">
              <HighlightedText 
                text={result.coreDescription || result.definition || 'No description available'} 
                matches={[
                  ...getMatchesForField(result.matches, 'coreDescription'),
                  ...getMatchesForField(result.matches, 'definition')
                ]}
              />
            </div>

            {/* Alternative Labels Preview */}
            {result.exampleAlternateDesignation && (
              <div className="mt-2 text-xs text-gray-500">
                <span className="font-medium">Also known as:</span>{' '}
                <HighlightedText 
                  text={result.exampleAlternateDesignation.split('\n')[0]} 
                  matches={getMatchesForField(result.matches, 'exampleAlternateDesignation')}
                />
                {result.exampleAlternateDesignation.includes('\n') && '...'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface HighlightedTextProps {
  text: string;
  matches: readonly [number, number][];
}

function HighlightedText({ text, matches }: HighlightedTextProps) {
  if (!matches.length) {
    return <span>{text}</span>;
  }

  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort matches by start index
  const sortedMatches = [...matches].sort((a, b) => a[0] - b[0]);

  sortedMatches.forEach(([start, end], index) => {
    // Add text before match
    if (start > lastIndex) {
      result.push(text.slice(lastIndex, start));
    }
    
    // Add highlighted match
    result.push(
      <mark 
        key={index} 
        className="bg-yellow-200 px-0.5 rounded font-medium"
      >
        {text.slice(start, end + 1)}
      </mark>
    );
    
    lastIndex = end + 1;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return <>{result}</>;
}

function getMatchesForField(
  matches: Array<{ key: string; value: string; indices: readonly [number, number][] }>, 
  fieldName: string
): readonly [number, number][] {
  return matches
    .filter(match => match.key === fieldName)
    .flatMap(match => match.indices);
}

function getRelevanceColor(score: number): string {
  if (score > 0.8) return '#dcfce7'; // green-100
  if (score > 0.6) return '#fef3c7'; // yellow-100
  if (score > 0.4) return '#fed7aa'; // orange-100
  return '#fecaca'; // red-100
}