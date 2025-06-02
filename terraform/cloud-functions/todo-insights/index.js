const functions = require('@google-cloud/functions-framework');
const { LanguageServiceClient } = require('@google-cloud/language');
const { Pool } = require('pg');

// Initialize Google Cloud Natural Language client
const languageClient = new LanguageServiceClient();

// Database connection pool
let dbPool;

function getDbPool() {
  if (!dbPool) {
    dbPool = new Pool({
      host: process.env.DB_HOST || '10.0.1.2',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'todoapp',
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return dbPool;
}

// Category mapping based on keywords and entities
const categoryMappings = {
  'work': ['meeting', 'project', 'deadline', 'presentation', 'report', 'client', 'office', 'email', 'call', 'conference'],
  'personal': ['home', 'family', 'friend', 'birthday', 'anniversary', 'vacation', 'hobby', 'book', 'movie'],
  'health': ['doctor', 'gym', 'exercise', 'medicine', 'appointment', 'workout', 'diet', 'yoga', 'run'],
  'shopping': ['buy', 'purchase', 'store', 'market', 'groceries', 'amazon', 'order', 'delivery'],
  'finance': ['bank', 'pay', 'bill', 'tax', 'investment', 'budget', 'money', 'loan', 'insurance'],
  'education': ['study', 'learn', 'course', 'exam', 'homework', 'research', 'university', 'school'],
  'travel': ['flight', 'hotel', 'trip', 'vacation', 'passport', 'visa', 'booking', 'itinerary'],
  'maintenance': ['fix', 'repair', 'clean', 'maintenance', 'service', 'upgrade', 'install']
};

// Priority keywords
const priorityKeywords = {
  'high': ['urgent', 'asap', 'critical', 'important', 'deadline', 'emergency', 'immediately'],
  'medium': ['soon', 'next week', 'scheduled', 'planned', 'routine'],
  'low': ['someday', 'when possible', 'optional', 'nice to have', 'eventually']
};

functions.http('todoInsights', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { title, description = '', userId, todoId } = req.body;
    
    if (!title || !userId) {
      res.status(400).json({ 
        error: 'Missing required fields: title and userId' 
      });
      return;
    }

    // Combine title and description for analysis
    const text = `${title}. ${description}`.trim();
    
    console.log('Analyzing todo:', { title, description, userId, todoId });

    // Analyze text with Google Natural Language API
    const insights = await analyzeTodoText(text);
    
    // Update todo in database if todoId provided
    if (todoId) {
      await updateTodoInsights(todoId, userId, insights);
    }

    res.json({
      success: true,
      data: {
        insights,
        originalText: text,
        analysis: {
          suggestedCategory: insights.category,
          suggestedPriority: insights.priority,
          confidence: insights.confidence,
          entities: insights.entities,
          sentiment: insights.sentiment
        }
      }
    });

  } catch (error) {
    console.error('Todo insights error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

async function analyzeTodoText(text) {
  try {
    // Prepare the document for analysis
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    // Analyze entities and sentiment
    const [entitiesResult] = await languageClient.analyzeEntities({ document });
    const [sentimentResult] = await languageClient.analyzeSentiment({ document });
    
    const entities = entitiesResult.entities || [];
    const sentiment = sentimentResult.documentSentiment;

    // Determine category based on entities and keywords
    const category = predictCategory(text, entities);
    
    // Determine priority based on sentiment and keywords
    const priority = predictPriority(text, sentiment);
    
    // Calculate confidence score
    const confidence = calculateConfidence(text, entities, category, priority);

    return {
      category,
      priority,
      confidence,
      entities: entities.map(entity => ({
        name: entity.name,
        type: entity.type,
        salience: entity.salience
      })),
      sentiment: {
        score: sentiment.score,
        magnitude: sentiment.magnitude
      },
      keywords: extractKeywords(text)
    };

  } catch (error) {
    console.error('NLP Analysis failed:', error);
    
    // Fallback to keyword-based analysis
    return fallbackAnalysis(text);
  }
}

function predictCategory(text, entities) {
  const textLower = text.toLowerCase();
  const scores = {};

  // Initialize scores
  Object.keys(categoryMappings).forEach(category => {
    scores[category] = 0;
  });

  // Score based on keyword matching
  Object.entries(categoryMappings).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (textLower.includes(keyword)) {
        scores[category] += 2;
      }
    });
  });

  // Score based on entities
  entities.forEach(entity => {
    const entityName = entity.name.toLowerCase();
    Object.entries(categoryMappings).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (entityName.includes(keyword) || keyword.includes(entityName)) {
          scores[category] += entity.salience * 3;
        }
      });
    });
  });

  // Find the category with the highest score
  const bestCategory = Object.entries(scores).reduce((a, b) => 
    scores[a[0]] > scores[b[0]] ? a : b
  )[0];

  return scores[bestCategory] > 0 ? bestCategory : 'general';
}

function predictPriority(text, sentiment) {
  const textLower = text.toLowerCase();
  let priorityScore = 0;

  // Check for explicit priority keywords
  Object.entries(priorityKeywords).forEach(([priority, keywords]) => {
    keywords.forEach(keyword => {
      if (textLower.includes(keyword)) {
        switch (priority) {
          case 'high': priorityScore += 3; break;
          case 'medium': priorityScore += 1; break;
          case 'low': priorityScore -= 1; break;
        }
      }
    });
  });

  // Use sentiment to influence priority
  if (sentiment) {
    // Negative sentiment might indicate urgency
    if (sentiment.score < -0.3) {
      priorityScore += 2;
    }
    // High magnitude indicates strong emotion
    if (sentiment.magnitude > 0.8) {
      priorityScore += 1;
    }
  }

  // Determine final priority
  if (priorityScore >= 3) return 'high';
  if (priorityScore >= 0) return 'medium';
  return 'low';
}

function calculateConfidence(text, entities, category, priority) {
  let confidence = 0.5; // Base confidence

  // Increase confidence based on entity count and salience
  if (entities.length > 0) {
    const avgSalience = entities.reduce((sum, e) => sum + e.salience, 0) / entities.length;
    confidence += avgSalience * 0.3;
  }

  // Increase confidence if we found specific keywords
  const textLower = text.toLowerCase();
  const categoryKeywords = categoryMappings[category] || [];
  const matchedKeywords = categoryKeywords.filter(keyword => 
    textLower.includes(keyword)
  );
  
  if (matchedKeywords.length > 0) {
    confidence += 0.2;
  }

  // Cap confidence at 1.0
  return Math.min(confidence, 1.0);
}

function extractKeywords(text) {
  const words = text.toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been'].includes(word));
  
  return [...new Set(words)].slice(0, 5);
}

function fallbackAnalysis(text) {
  // Simple keyword-based fallback
  const textLower = text.toLowerCase();
  
  let category = 'general';
  let priority = 'medium';

  // Find category
  for (const [cat, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        category = cat;
        break;
      }
    }
    if (category !== 'general') break;
  }

  // Find priority
  for (const [pri, keywords] of Object.entries(priorityKeywords)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        priority = pri;
        break;
      }
    }
    if (priority !== 'medium') break;
  }

  return {
    category,
    priority,
    confidence: 0.6,
    entities: [],
    sentiment: { score: 0, magnitude: 0 },
    keywords: extractKeywords(text)
  };
}

async function updateTodoInsights(todoId, userId, insights) {
  const db = getDbPool();
  
  try {
    const query = `
      UPDATE todos 
      SET 
        category = $1,
        priority = $2,
        updated_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;
    
    const result = await db.query(query, [
      insights.category,
      insights.priority,
      todoId,
      userId
    ]);

    console.log('Updated todo with insights:', result.rows[0]);
    return result.rows[0];
    
  } catch (error) {
    console.error('Database update error:', error);
    throw error;
  }
} 