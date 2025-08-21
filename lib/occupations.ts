import Papa from 'papaparse';
import { Occupation, OccupationGroup } from './types';

interface CSVRow {
  'User Link'?: string;
  'Key ID'?: string;
  'ISCO GROUP CODE'?: string;
  'CODE'?: string;
  'PREFERRED LABEL'?: string;
  'Example Alternate Designation'?: string;
  'Core Description'?: string;
  'ISCO Tax Included'?: string;
  'DEFINITION'?: string;
  'SCOPE NOTE'?: string;
  'REGULATED PROFESSION NOTE'?: string;
  'OCCUPATION TYPE'?: string;
  'Status'?: string;
}

export async function loadOccupations(): Promise<Occupation[]> {
  const response = await fetch('/occupations.csv');
  const text = await response.text();
  
  const result = Papa.parse<CSVRow>(text, {
    header: true,
    skipEmptyLines: true,
  });
  
  return result.data.map((row) => ({
    userLink: row['User Link'] || '',
    keyId: row['Key ID'] || '',
    iscoGroupCode: row['ISCO GROUP CODE'] || '',
    code: row['CODE'] || '',
    preferredLabel: row['PREFERRED LABEL'] || '',
    exampleAlternateDesignation: row['Example Alternate Designation'] || '',
    coreDescription: row['Core Description'] || '',
    iscoTaxIncluded: row['ISCO Tax Included'] || '',
    definition: row['DEFINITION'] || '',
    scopeNote: row['SCOPE NOTE'] || '',
    regulatedProfessionNote: row['REGULATED PROFESSION NOTE'] || '',
    occupationType: row['OCCUPATION TYPE'] || '',
    status: row['Status'] || '',
  }));
}

export function organizeOccupations(occupations: Occupation[]): OccupationGroup[] {
  const groups: Map<string, OccupationGroup> = new Map();
  
  occupations.forEach(occupation => {
    const code = occupation.code;
    if (!code) return;
    
    // Extract the main 4-digit ISCO code
    const mainCode = code.split('.')[0];
    if (!mainCode || mainCode.length < 1) return;
    
    const majorGroup = mainCode[0];
    const subMajorGroup = mainCode.substring(0, 2);
    const minorGroup = mainCode.substring(0, 3);
    const unitGroup = mainCode;
    
    // Create major group (1 digit)
    if (!groups.has(majorGroup)) {
      groups.set(majorGroup, {
        code: majorGroup,
        name: getMajorGroupName(majorGroup),
        children: []
      });
    }
    
    const majorGroupObj = groups.get(majorGroup)!;
    
    // Create sub-major group (2 digits) if different from major
    if (subMajorGroup.length === 2) {
      let subMajorGroupObj = majorGroupObj.children.find(
        (child): child is OccupationGroup => 
          typeof child === 'object' && 'children' in child && child.code === subMajorGroup
      );
      
      if (!subMajorGroupObj) {
        subMajorGroupObj = {
          code: subMajorGroup,
          name: getSubMajorGroupName(subMajorGroup),
          children: []
        };
        majorGroupObj.children.push(subMajorGroupObj);
      }
      
      // Create minor group (3 digits)
      if (minorGroup.length === 3) {
        let minorGroupObj = subMajorGroupObj.children.find(
          (child): child is OccupationGroup => 
            typeof child === 'object' && 'children' in child && child.code === minorGroup
        );
        
        if (!minorGroupObj) {
          minorGroupObj = {
            code: minorGroup,
            name: getMinorGroupName(minorGroup),
            children: []
          };
          subMajorGroupObj.children.push(minorGroupObj);
        }
        
        // Create unit group (4 digits)
        if (unitGroup.length === 4) {
          let unitGroupObj = minorGroupObj.children.find(
            (child): child is OccupationGroup => 
              typeof child === 'object' && 'children' in child && child.code === unitGroup
          );
          
          if (!unitGroupObj) {
            unitGroupObj = {
              code: unitGroup,
              name: getUnitGroupName(unitGroup),
              children: []
            };
            minorGroupObj.children.push(unitGroupObj);
          }
          
          // Add the actual occupation
          unitGroupObj.children.push(occupation);
        } else {
          // Add to minor group if no unit group
          minorGroupObj.children.push(occupation);
        }
      } else if (unitGroup.length === 4) {
        // Handle 4-digit codes without 3-digit minor group
        let unitGroupObj = subMajorGroupObj.children.find(
          (child): child is OccupationGroup => 
            typeof child === 'object' && 'children' in child && child.code === unitGroup
        );
        
        if (!unitGroupObj) {
          unitGroupObj = {
            code: unitGroup,
            name: getUnitGroupName(unitGroup),
            children: []
          };
          subMajorGroupObj.children.push(unitGroupObj);
        }
        unitGroupObj.children.push(occupation);
      } else {
        // Add to sub-major group if no minor/unit group
        subMajorGroupObj.children.push(occupation);
      }
    } else {
      // Add directly to major group if code is too short
      majorGroupObj.children.push(occupation);
    }
  });
  
  // Sort all groups and their children
  const sortedGroups = Array.from(groups.values()).sort((a, b) => a.code.localeCompare(b.code));
  sortedGroups.forEach(group => sortChildren(group));
  
  return sortedGroups;
}

function sortChildren(group: OccupationGroup) {
  group.children.sort((a, b) => {
    const aCode = 'code' in a ? a.code : (a as Occupation).code;
    const bCode = 'code' in b ? b.code : (b as Occupation).code;
    return aCode.localeCompare(bCode);
  });
  
  group.children.forEach(child => {
    if ('children' in child) {
      sortChildren(child as OccupationGroup);
    }
  });
}

function getMajorGroupName(code: string): string {
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

function getSubMajorGroupName(code: string): string {
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
    '31': 'Science and engineering associate professionals',
    '32': 'Health associate professionals',
    '33': 'Business and administration associate professionals',
    '34': 'Legal, social, cultural and related associate professionals',
    '35': 'Information and communications technicians',
    '41': 'General and keyboard clerks',
    '42': 'Customer services clerks',
    '43': 'Numerical and material recording clerks',
    '44': 'Other clerical support workers',
    '51': 'Personal service workers',
    '52': 'Sales workers',
    '53': 'Personal care workers',
    '54': 'Protective services workers',
    '61': 'Market-oriented skilled agricultural workers',
    '62': 'Market-oriented skilled forestry, fishery and hunting workers',
    '63': 'Subsistence farmers, fishers, hunters and gatherers',
    '71': 'Building and related trades workers, excluding electricians',
    '72': 'Metal, machinery and related trades workers',
    '73': 'Handicraft and printing workers',
    '74': 'Electrical and electronic trades workers',
    '75': 'Food processing, wood working, garment and other craft workers',
    '81': 'Stationary plant and machine operators',
    '82': 'Assemblers',
    '83': 'Drivers and mobile plant operators',
    '91': 'Cleaners and helpers',
    '92': 'Agricultural, forestry and fishery labourers',
    '93': 'Labourers in mining, construction, manufacturing and transport',
    '94': 'Food preparation assistants',
    '95': 'Street and related sales and service workers',
    '96': 'Refuse workers and other elementary workers'
  };
  return names[code] || `Group ${code}`;
}

function getMinorGroupName(code: string): string {
  const names: Record<string, string> = {
    // Managers
    '111': 'Legislators and senior officials',
    '112': 'Managing directors and chief executives',
    '121': 'Business services and administration managers',
    '122': 'Sales, marketing and development managers',
    '131': 'Production managers in agriculture, forestry and fisheries',
    '132': 'Manufacturing, mining, construction, and distribution managers',
    '133': 'Information and communications technology service managers',
    '134': 'Professional services managers',
    '141': 'Hotel and restaurant managers',
    '142': 'Retail and wholesale trade managers',
    '143': 'Other services managers',
    
    // Professionals
    '211': 'Physical and earth science professionals',
    '212': 'Mathematicians, actuaries and statisticians',
    '213': 'Life science professionals',
    '214': 'Engineering professionals (excluding electrotechnology)',
    '215': 'Electrotechnology engineers',
    '216': 'Architects, planners, surveyors and designers',
    '221': 'Medical doctors',
    '222': 'Nursing and midwifery professionals',
    '223': 'Traditional and complementary medicine professionals',
    '224': 'Paramedical practitioners',
    '225': 'Veterinarians',
    '226': 'Other health professionals',
    '231': 'University and higher education teachers',
    '232': 'Vocational education teachers',
    '233': 'Secondary education teachers',
    '234': 'Primary school and early childhood teachers',
    '235': 'Other teaching professionals',
    '241': 'Finance professionals',
    '242': 'Administration professionals',
    '243': 'Sales, marketing and public relations professionals',
    '251': 'Software and applications developers and analysts',
    '252': 'Database and network professionals',
    '261': 'Legal professionals',
    '262': 'Librarians, archivists and curators',
    '263': 'Social and religious professionals',
    '264': 'Authors, journalists and linguists',
    '265': 'Creative and performing artists',
    
    // Technicians
    '311': 'Physical and engineering science technicians',
    '312': 'Mining, manufacturing and construction supervisors',
    '313': 'Process control technicians',
    '314': 'Life science technicians and related associate professionals',
    '315': 'Ship and aircraft controllers and technicians',
    '321': 'Medical and pharmaceutical technicians',
    '322': 'Nursing and midwifery associate professionals',
    '323': 'Traditional and complementary medicine associate professionals',
    '324': 'Veterinary technicians and assistants',
    '325': 'Other health associate professionals',
    '331': 'Financial and mathematical associate professionals',
    '332': 'Sales and purchasing agents and brokers',
    '333': 'Business services agents',
    '334': 'Administrative and specialised secretaries',
    '335': 'Regulatory government associate professionals',
    '341': 'Legal, social and religious associate professionals',
    '342': 'Sports and fitness workers',
    '343': 'Artistic, cultural and culinary associate professionals',
    '351': 'Information and communications technology operations technicians',
    '352': 'Telecommunications and broadcasting technicians',
    
    // Add more as needed...
  };
  return names[code] || `Group ${code}`;
}

function getUnitGroupName(code: string): string {
  const names: Record<string, string> = {
    // Sample unit groups - add more as needed
    '1111': 'Legislators',
    '1112': 'Senior government officials',
    '1113': 'Traditional chiefs and heads of village',
    '1114': 'Senior officials of special-interest organisations',
    '1120': 'Managing directors and chief executives',
    '1211': 'Finance managers',
    '1212': 'Human resource managers',
    '1213': 'Policy and planning managers',
    '1219': 'Business services and administration managers not elsewhere classified',
    '1221': 'Sales and marketing managers',
    '1222': 'Advertising and public relations managers',
    '1223': 'Research and development managers',
    '1311': 'Agricultural and forestry production managers',
    '1312': 'Aquaculture and fisheries production managers',
    '1321': 'Manufacturing managers',
    '1322': 'Mining managers',
    '1323': 'Construction managers',
    '1324': 'Supply, distribution and related managers',
    '1330': 'Information and communications technology service managers',
    '1341': 'Child care services managers',
    '1342': 'Health services managers',
    '1343': 'Aged care services managers',
    '1344': 'Social welfare managers',
    '1345': 'Education managers',
    '1346': 'Financial and insurance services branch managers',
    '1349': 'Professional services managers not elsewhere classified',
    '1411': 'Hotel managers',
    '1412': 'Restaurant managers',
    '1420': 'Retail and wholesale trade managers',
    '1431': 'Sports, recreation and cultural centre managers',
    '1439': 'Services managers not elsewhere classified',
    
    // Professionals
    '2111': 'Physicists and astronomers',
    '2112': 'Meteorologists',
    '2113': 'Chemists',
    '2114': 'Geologists and geophysicists',
    '2120': 'Mathematicians, actuaries and statisticians',
    '2131': 'Biologists, botanists, zoologists and related professionals',
    '2132': 'Farming, forestry and fisheries advisers',
    '2133': 'Environmental protection professionals',
    '2141': 'Industrial and production engineers',
    '2142': 'Civil engineers',
    '2143': 'Environmental engineers',
    '2144': 'Mechanical engineers',
    '2145': 'Chemical engineers',
    '2146': 'Mining engineers, metallurgists and related professionals',
    '2149': 'Engineering professionals not elsewhere classified',
    '2151': 'Electrical engineers',
    '2152': 'Electronics engineers',
    '2153': 'Telecommunications engineers',
    '2161': 'Building architects',
    '2162': 'Landscape architects',
    '2163': 'Product and garment designers',
    '2164': 'Town and traffic planners',
    '2165': 'Cartographers and surveyors',
    '2166': 'Graphic and multimedia designers',
    
    // Add more as needed...
  };
  return names[code] || `Group ${code}`;
}