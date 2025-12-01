/**
 * Text comparison utilities extracted from frontend logic
 * Used for calculating word counts and mistakes in typing tests
 */

/**
 * Tokenize text into words and punctuation
 * @param {string} text - The text to tokenize
 * @returns {string[]} Array of tokens (words and punctuation)
 */
export function tokenize(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  return text.match(/\w+|[^\w\s]+/g) || [];
}

/**
 * Represents a word in the diff alignment
 * @typedef {Object} DiffWord
 * @property {string} given - The word from the reference text
 * @property {string} typed - The word from the typed text
 * @property {'equal'|'substitution'|'insertion'|'deletion'} type - The type of difference
 */

/**
 * Align tokens from reference and typed text using dynamic programming
 * @param {string} given - The reference text
 * @param {string} typed - The typed text
 * @returns {DiffWord[]} Array of aligned words with their differences
 */
export function alignTokens(given, typed) {
  const ref = tokenize(given);
  const hyp = tokenize(typed);

  const n = ref.length;
  const m = hyp.length;

  // Dynamic programming table for edit distance
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  
  // Backtrack table to reconstruct alignment
  const bt = Array.from({ length: n + 1 }, () => 
    Array(m + 1).fill('equal')
  );

  // Initialize base cases
  for (let i = 0; i <= n; ++i) dp[i][0] = i;
  for (let j = 0; j <= m; ++j) dp[0][j] = j;

  // Fill DP table
  for (let i = 1; i <= n; ++i) {
    for (let j = 1; j <= m; ++j) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
        bt[i][j] = 'equal';
      } else {
        const sub = dp[i - 1][j - 1] + 1; // substitution
        const ins = dp[i][j - 1] + 1;     // insertion
        const del = dp[i - 1][j] + 1;     // deletion
        const min = Math.min(sub, ins, del);
        dp[i][j] = min;

        if (min === sub) bt[i][j] = 'substitution';
        else if (min === ins) bt[i][j] = 'insertion';
        else bt[i][j] = 'deletion';
      }
    }
  }

  // Backtrack to reconstruct alignment
  let i = n;
  let j = m;
  const result = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && bt[i][j] === 'equal') {
      result.unshift({ 
        given: ref[i - 1], 
        typed: hyp[j - 1], 
        type: 'equal' 
      });
      i--;
      j--;
    } else if (i > 0 && j > 0 && bt[i][j] === 'substitution') {
      result.unshift({
        given: ref[i - 1],
        typed: hyp[j - 1],
        type: 'substitution'
      });
      i--;
      j--;
    } else if (j > 0 && bt[i][j] === 'insertion') {
      result.unshift({ 
        given: '', 
        typed: hyp[j - 1], 
        type: 'insertion' 
      });
      j--;
    } else if (i > 0 && bt[i][j] === 'deletion') {
      result.unshift({ 
        given: ref[i - 1], 
        typed: '', 
        type: 'deletion' 
      });
      i--;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Count mistakes from aligned words
 * Groups substitution + deletion of punctuation as one mistake
 * @param {DiffWord[]} words - Array of aligned words
 * @returns {number} Total number of mistakes
 */
export function countMistakes(words) {
  let mistakes = 0;
  let i = 0;

  while (i < words.length) {
    const curr = words[i];

    // Group substitution + deletion of punctuation as one mistake
    if (
      curr.type === 'substitution' &&
      i + 1 < words.length &&
      words[i + 1].type === 'deletion' &&
      /^[^\w\s]+$/.test(words[i + 1].given)
    ) {
      mistakes += 1;
      i += 2;
    } else if (curr.type !== 'equal') {
      mistakes += 1;
      i += 1;
    } else {
      i += 1;
    }
  }

  return mistakes;
}

/**
 * Calculate word statistics from reference and typed text
 * @param {string} givenText - The reference text
 * @param {string} typedText - The typed text
 * @returns {Object} Statistics object with totalWords, writtenWords, and totalMistakes
 */
export function calculateWordStatistics(givenText, typedText) {
  if (!givenText) {
    return {
      totalWords: 0,
      writtenWords: 0,
      totalMistakes: 0
    };
  }

  const totalWords = tokenize(givenText).length;
  const writtenWords = typedText ? tokenize(typedText).length : 0;
  
  let totalMistakes = 0;
  if (typedText) {
    const alignedWords = alignTokens(givenText, typedText);
    totalMistakes = countMistakes(alignedWords);
  }

  return {
    totalWords,
    writtenWords,
    totalMistakes
  };
}

/**
 * Calculate detailed mistakes array from aligned words
 * @param {DiffWord[]} alignedWords - Array of aligned words
 * @returns {Array} Array of mistake objects with word, expected, typed, and position
 */
export function calculateDetailedMistakes(alignedWords) {
  const mistakes = [];
  let position = 0;

  for (let i = 0; i < alignedWords.length; i++) {
    const word = alignedWords[i];
    
    if (word.type === 'equal') {
      position++;
      continue;
    }

    if (word.type === 'substitution') {
      mistakes.push({
        word: word.given,
        expected: word.given,
        typed: word.typed,
        position: position
      });
      position++;
    } else if (word.type === 'insertion') {
      mistakes.push({
        word: '',
        expected: '',
        typed: word.typed,
        position: position
      });
    } else if (word.type === 'deletion') {
      mistakes.push({
        word: word.given,
        expected: word.given,
        typed: '',
        position: position
      });
      position++;
    }
  }

  return mistakes;
}

/**
 * Calculate all result metrics from reference text, typed text, and time taken
 * @param {string} referenceText - The reference text from the test
 * @param {string} typedText - The text typed by the student
 * @param {number} timeTaken - Time taken in seconds
 * @returns {Object} Complete result metrics object
 */
export function calculateAllMetrics(referenceText, typedText, timeTaken) {
  if (!referenceText) {
    referenceText = '';
  }
  if (!typedText) {
    typedText = '';
  }
  if (!timeTaken || timeTaken <= 0) {
    timeTaken = 1; // Avoid division by zero
  }

  // Tokenize both texts
  const refTokens = tokenize(referenceText);
  const typedTokens = tokenize(typedText);

  // Basic word counts
  const totalWords = refTokens.length;
  const writtenWords = typedTokens.length;

  // Align tokens to find differences
  const alignedWords = alignTokens(referenceText, typedText);
  const totalMistakes = countMistakes(alignedWords);

  // Calculate correct and incorrect words
  // Correct words are those that match exactly (type === 'equal')
  // Incorrect words include substitutions, insertions, and deletions
  let correctWords = 0;
  let incorrectWords = 0;
  
  alignedWords.forEach(word => {
    if (word.type === 'equal') {
      correctWords++;
    } else {
      // Count substitutions, insertions, and deletions as incorrect
      // But group substitution + punctuation deletion as one mistake
      if (word.type === 'substitution' || word.type === 'insertion') {
        incorrectWords++;
      } else if (word.type === 'deletion') {
        incorrectWords++;
      }
    }
  });

  // Character counts
  const totalCharacters = referenceText.length;
  const typedCharacters = typedText.length;
  
  // Calculate correct and incorrect characters
  let correctCharacters = 0;
  let incorrectCharacters = 0;
  
  // Simple character-by-character comparison
  const minLength = Math.min(referenceText.length, typedText.length);
  for (let i = 0; i < minLength; i++) {
    if (referenceText[i] === typedText[i]) {
      correctCharacters++;
    } else {
      incorrectCharacters++;
    }
  }
  
  // Add remaining characters as incorrect
  if (typedText.length > referenceText.length) {
    incorrectCharacters += (typedText.length - referenceText.length);
  } else if (referenceText.length > typedText.length) {
    incorrectCharacters += (referenceText.length - typedText.length);
  }

  // Calculate WPM (Words Per Minute)
  // WPM = (correct characters / 5) / (time in minutes)
  const wpm = timeTaken > 0 ? Math.round(((correctCharacters / 5) / (timeTaken / 60)) * 100) / 100 : 0;

  // Calculate Accuracy (percentage of correct characters)
  const accuracy = totalCharacters > 0 
    ? Math.round((correctCharacters / totalCharacters) * 100 * 100) / 100 
    : 0;

  // Speed is same as WPM for typing tests
  const speed = wpm;

  // Calculate detailed mistakes
  const detailedMistakes = calculateDetailedMistakes(alignedWords);

  return {
    wpm: Math.max(0, wpm),
    accuracy: Math.max(0, Math.min(100, accuracy)),
    speed: Math.max(0, speed),
    totalWords,
    correctWords,
    incorrectWords,
    totalCharacters,
    correctCharacters,
    incorrectCharacters,
    totalMistakes,
    mistakes: detailedMistakes,
    stenographyErrors: [] // Can be populated separately if needed
  };
}

