import React from 'react';

/**
 * Transforms a single word into a Bionic reading formatted span.
 * The initial letters are bolded with high-contrast fixation weighting.
 */
export function formatBionicWord(
  word: string,
  fixationPercent = 50,
  key?: string | number
): React.ReactNode {
  // Extract leading punctuation, core alphabetic word, and trailing punctuation
  const match = word.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}]+)([^\p{L}\p{N}]*)$/u);
  if (!match) {
    return <span key={key}>{word} </span>;
  }

  const [, leadingPunct, coreWord, trailingPunct] = match;
  const len = coreWord.length;

  let boldLen = 1;
  if (len <= 2) {
    boldLen = 1;
  } else if (len <= 4) {
    boldLen = 2;
  } else {
    boldLen = Math.max(1, Math.min(len, Math.ceil(len * (fixationPercent / 100))));
  }

  const boldPart = coreWord.slice(0, boldLen);
  const regularPart = coreWord.slice(boldLen);

  return (
    <span key={key} className="inline-block whitespace-normal">
      {leadingPunct}
      <strong className="font-extrabold tracking-normal text-inherit">{boldPart}</strong>
      <span className="opacity-80 text-inherit">{regularPart}</span>
      {trailingPunct}{' '}
    </span>
  );
}

/**
 * Transforms plain text into an array of React nodes with optional Bionic Reading
 * and syllable hyphenation.
 */
export function renderAccessibleText(
  text: string,
  options: {
    bionicEnabled?: boolean;
    fixationPercent?: number;
    syllablesEnabled?: boolean;
    activeWordIndex?: number;
    activeSentenceIndex?: number;
  } = {}
): React.ReactNode[] {
  const {
    bionicEnabled = true,
    fixationPercent = 50,
    syllablesEnabled = false,
    activeWordIndex = -1
  } = options;

  const paragraphs = text.split('\n\n');
  let globalWordCount = 0;

  return paragraphs.map((para, pIdx) => {
    const words = para.split(/\s+/).filter(Boolean);

    return (
      <p key={`p-${pIdx}`} className="mb-6 last:mb-0 leading-relaxed">
        {words.map((rawWord, wIdx) => {
          const currentGlobalIdx = globalWordCount++;
          const isHighlighted = activeWordIndex === currentGlobalIdx;

          let displayWord = rawWord;
          if (syllablesEnabled && rawWord.length > 5) {
            // Simple assistive syllable insertion for long words
            displayWord = rawWord.replace(/(.{3,4})(?=[a-z]{3,})/gi, '$1·');
          }

          const wordNode = bionicEnabled ? (
            formatBionicWord(displayWord, fixationPercent, `w-${wIdx}`)
          ) : (
            <span key={`w-${wIdx}`}>{displayWord} </span>
          );

          if (isHighlighted) {
            return (
              <span
                key={`hl-${wIdx}`}
                className="bg-secondary-container/40 text-text-primary px-1 py-0.5 rounded transition-all duration-150 inline-block font-medium shadow-sm"
              >
                {wordNode}
              </span>
            );
          }

          return wordNode;
        })}
      </p>
    );
  });
}
