import Fuse, { IFuseOptions } from 'fuse.js';
import { Occupation } from './types';

export interface SearchResult extends Occupation {
  score: number;
  matches: Array<{
    key: string;
    value: string;
    indices: readonly [number, number][];
  }>;
  breadcrumb: string;
}

export interface SearchFilters {
  iscoMajorGroups: string[];
  occupationTypes: string[];
}

export class EnhancedSearchEngine {
  private fuse: Fuse<Occupation>;
  private occupations: Occupation[];

  constructor(occupations: Occupation[]) {
    this.occupations = occupations;
    
    // Configure Fuse.js for intelligent fuzzy search
    const options: IFuseOptions<Occupation> = {
      keys: [
        // Weighted fields - higher weight = more important
        { name: 'preferredLabel', weight: 0.4 },
        { name: 'code', weight: 0.3 },
        { name: 'exampleAlternateDesignation', weight: 0.2 },
        { name: 'coreDescription', weight: 0.15 },
        { name: 'definition', weight: 0.1 },
        { name: 'iscoTaxIncluded', weight: 0.08 },
        { name: 'scopeNote', weight: 0.05 },
        { name: 'occupationType', weight: 0.03 }
      ],
      threshold: 0.4, // 0 = perfect match, 1 = match anything
      distance: 100, // Maximum distance for fuzzy matching
      minMatchCharLength: 2,
      includeScore: true,
      includeMatches: true,
      findAllMatches: true,
      ignoreLocation: true // Don't penalize matches based on position
    };

    this.fuse = new Fuse(occupations, options);
  }

  search(query: string, filters?: SearchFilters, limit: number = 100): SearchResult[] {
    if (!query.trim()) {
      return this.getFilteredOccupations(filters).slice(0, limit);
    }

    // Perform fuzzy search
    const fuseResults = this.fuse.search(query, { limit: limit * 2 });

    // Transform results to our format
    let searchResults: SearchResult[] = fuseResults.map(result => ({
      ...result.item,
      score: 1 - (result.score || 0), // Invert score so higher is better
      matches: (result.matches || []).map(match => ({
        key: match.key || '',
        value: match.value || '',
        indices: match.indices || []
      })),
      breadcrumb: this.generateBreadcrumb(result.item)
    }));

    // Apply filters if provided
    if (filters) {
      searchResults = this.applyFilters(searchResults, filters);
    }

    // Additional relevance boosting
    searchResults = this.boostRelevance(searchResults, query);

    return searchResults.slice(0, limit);
  }

  private getFilteredOccupations(filters?: SearchFilters): SearchResult[] {
    let results = this.occupations;

    if (filters) {
      results = results.filter(occ => this.matchesFilters(occ, filters));
    }

    return results.map(occ => ({
      ...occ,
      score: 1,
      matches: [],
      breadcrumb: this.generateBreadcrumb(occ)
    }));
  }

  private applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    return results.filter(result => this.matchesFilters(result, filters));
  }

  private matchesFilters(occupation: Occupation, filters: SearchFilters): boolean {
    // Filter by ISCO major groups
    if (filters.iscoMajorGroups.length > 0) {
      const majorGroup = occupation.code?.[0];
      if (!majorGroup || !filters.iscoMajorGroups.includes(majorGroup)) {
        return false;
      }
    }

    // Filter by occupation types
    if (filters.occupationTypes.length > 0) {
      if (!occupation.occupationType || !filters.occupationTypes.includes(occupation.occupationType)) {
        return false;
      }
    }

    return true;
  }

  private generateBreadcrumb(occupation: Occupation): string {
    const code = occupation.code;
    if (!code) return '';

    const parts = [];
    
    // Major group (1 digit)
    const majorCode = code[0];
    if (majorCode) {
      parts.push(`${majorCode} - ${this.getMajorGroupName(majorCode)}`);
    }

    // Sub-major group (2 digits)
    if (code.length >= 2) {
      const subMajorCode = code.substring(0, 2);
      parts.push(`${subMajorCode} - ${this.getSubMajorGroupName(subMajorCode)}`);
    }

    // Minor group (3 digits)
    if (code.length >= 3) {
      const minorCode = code.substring(0, 3);
      parts.push(`${minorCode} - ${this.getMinorGroupName(minorCode)}`);
    }

    return parts.join(' > ');
  }

  private boostRelevance(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase();
    
    return results.map(result => {
      let boostedScore = result.score;
      
      // Boost exact matches in preferred label
      if (result.preferredLabel?.toLowerCase().includes(queryLower)) {
        boostedScore *= 1.3;
      }

      // Boost exact code matches
      if (result.code?.toLowerCase().includes(queryLower)) {
        boostedScore *= 1.2;
      }

      // Boost matches at word boundaries
      const wordBoundaryRegex = new RegExp(`\\b${queryLower}`, 'i');
      if (wordBoundaryRegex.test(result.preferredLabel || '')) {
        boostedScore *= 1.1;
      }

      return { ...result, score: boostedScore };
    }).sort((a, b) => b.score - a.score);
  }

  // Group name helper methods
  private getMajorGroupName(code: string): string {
    const names: Record<string, string> = {
      '0': 'Armed forces occupations',
      '1': 'Managers',
      '2': 'Professionals',
      '3': 'Technicians and associate professionals',
      '4': 'Clerical support workers',
      '5': 'Service and sales workers',
      '6': 'Skilled agricultural, forestry and fishery workers',
      '7': 'Craft and related trades workers',
      '8': 'Plant and machine operators, and assemblers',
      '9': 'Elementary occupations'
    };
    return names[code] || `Group ${code}`;
  }

  private getSubMajorGroupName(code: string): string {
    const names: Record<string, string> = {
      '11': 'Chief executives, senior officials and legislators',
      '12': 'Administrative and commercial managers',
      '13': 'Production and specialised services managers',
      '14': 'Hospitality, retail and other services managers',
      '21': 'Science and engineering professionals',
      '22': 'Health professionals',
      '23': 'Teaching professionals',
      '24': 'Business and administration professionals',
      '25': 'Information and communications technology professionals',
      '26': 'Legal, social and cultural professionals',
      // Add more as needed...
    };
    return names[code] || `Group ${code}`;
  }

  private getMinorGroupName(code: string): string {
    const names: Record<string, string> = {
      '111': 'Legislators and senior officials',
      '112': 'Managing directors and chief executives',
      '121': 'Business services and administration managers',
      '122': 'Sales, marketing and development managers',
      '211': 'Physical and earth science professionals',
      '212': 'Mathematicians, actuaries and statisticians',
      // Add more as needed...
    };
    return names[code] || `Group ${code}`;
  }

  getAvailableFilters(): { iscoMajorGroups: string[]; occupationTypes: string[] } {
    const iscoMajorGroups = new Set<string>();
    const occupationTypes = new Set<string>();

    this.occupations.forEach(occ => {
      if (occ.code?.[0]) {
        iscoMajorGroups.add(occ.code[0]);
      }
      if (occ.occupationType) {
        occupationTypes.add(occ.occupationType);
      }
    });

    return {
      iscoMajorGroups: Array.from(iscoMajorGroups).sort(),
      occupationTypes: Array.from(occupationTypes).sort()
    };
  }
}

// Utility function to highlight search matches in text
export function highlightMatches(text: string, matches: Array<[number, number]>): string {
  if (!matches.length) return text;
  
  let result = '';
  let lastIndex = 0;
  
  // Sort matches by start index
  const sortedMatches = [...matches].sort((a, b) => a[0] - b[0]);
  
  for (const [start, end] of sortedMatches) {
    // Add text before match
    result += text.slice(lastIndex, start);
    // Add highlighted match
    result += `<mark class="bg-yellow-200 px-1 rounded">${text.slice(start, end + 1)}</mark>`;
    lastIndex = end + 1;
  }
  
  // Add remaining text
  result += text.slice(lastIndex);
  
  return result;
}