// Global state for the database connection
// @ts-ignore
let dbInstance: any = null;
let initPromise: Promise<void> | null = null;

export interface DictionaryResult {
  word: string;
  phonetic: string;
  meaning: string;
}

export const initializeDictionary = async (): Promise<void> => {
  // If already initialized or initializing, return existing promise
  if (dbInstance) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log("Preloading dictionary database...");
      // @ts-ignore
      if (!window.initSqlJs) {
        throw new Error("SQL.js library not loaded");
      }

      // @ts-ignore
      const SQL = await window.initSqlJs({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });

      const dbFilename = 'lookup.db';
      const response = await fetch(dbFilename);
      
      if (!response.ok) {
        // Fail silently or warn if file missing, as it might not be deployed yet
        console.warn("Could not load dictionary database (lookup.db). Offline lookup will not work.");
        return;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      dbInstance = new SQL.Database(new Uint8Array(arrayBuffer));
      console.log("Dictionary database loaded successfully.");
    } catch (err) {
      console.error("Failed to preload dictionary:", err);
      // Reset promise so we can try again later if needed
      initPromise = null;
    }
  })();

  return initPromise;
};

// Helper to ensure DB is loaded before use
const getDb = async () => {
  if (!dbInstance) {
    await initializeDictionary();
  }
  return dbInstance;
};

export const searchDictionary = async (term: string): Promise<DictionaryResult[]> => {
  const db = await getDb();
  if (!db) return [];

  const safeTerm = term.trim().replace(/'/g, "''");
  
  // Exclude dict_bcz to prevent duplicates as requested
  const tablesQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'dict%' AND name != 'dict_bcz'";
  const tablesResult = db.exec(tablesQuery);

  const combinedResults: DictionaryResult[] = [];

  if (tablesResult.length > 0 && tablesResult[0].values) {
    const tables = tablesResult[0].values.flat();
    const LIMIT_PER_TABLE = 20; 

    for (const tableName of tables) {
      // Use LIKE for fuzzy matching
      const query = `
        SELECT word, accent, mean_cn 
        FROM ${tableName} 
        WHERE word LIKE '%${safeTerm}%' OR mean_cn LIKE '%${safeTerm}%' 
        LIMIT ${LIMIT_PER_TABLE}
      `;

      try {
        const res = db.exec(query);
        if (res.length > 0 && res[0].values.length > 0) {
          res[0].values.forEach((row: any[]) => {
            combinedResults.push({
              word: String(row[0]),
              phonetic: row[1] ? String(row[1]) : '',
              meaning: row[2] ? String(row[2]) : ''
            });
          });
        }
      } catch (err) {
        console.warn(`Error querying table ${tableName}`, err);
      }
      
      if (combinedResults.length >= 50) break;
    }
  }

  return combinedResults;
};

export const lookupExactWord = async (word: string): Promise<DictionaryResult | null> => {
  const db = await getDb();
  if (!db) return null;

  const safeWord = word.trim().toLowerCase().replace(/'/g, "''");
  
  // Exclude dict_bcz to prevent duplicates
  const tablesQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'dict%' AND name != 'dict_bcz'";
  const tablesResult = db.exec(tablesQuery);

  if (tablesResult.length > 0 && tablesResult[0].values) {
    const tables = tablesResult[0].values.flat();
    
    for (const tableName of tables) {
      const query = `SELECT word, accent, mean_cn FROM ${tableName} WHERE LOWER(word) = '${safeWord}' LIMIT 1`;
      try {
        const res = db.exec(query);
        if (res.length > 0 && res[0].values.length > 0) {
          const row = res[0].values[0];
          return {
            word: String(row[0]),
            phonetic: row[1] ? String(row[1]) : '',
            meaning: row[2] ? String(row[2]) : ''
          };
        }
      } catch (err) {
        console.warn(`Error querying table ${tableName}`, err);
      }
    }
  }

  return null;
};