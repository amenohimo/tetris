import type { PieceType } from '../types';

const PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export interface Randomizer {
  next(): PieceType;
  peek(n: number): PieceType[];
  reset(): void;
}

function createRandomizer(): Randomizer {
  let bag: PieceType[] = [];
  let bagIndex = 0;

  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function refillBag(): void {
    bag = shuffleArray(PIECES);
    bagIndex = 0;
  }

  function ensureBagHasPieces(): void {
    if (bag.length === 0 || bagIndex >= bag.length) {
      refillBag();
    }
  }

  return {
    next(): PieceType {
      ensureBagHasPieces();
      return bag[bagIndex++];
    },

    peek(n: number): PieceType[] {
      if (n <= 0) return [];
      
      const result: PieceType[] = [];
      let piecesNeeded = n;
      let currentIndex = bagIndex;
      
      while (piecesNeeded > 0) {
        ensureBagHasPieces();
        const availableInBag = bag.length - currentIndex;
        const take = Math.min(piecesNeeded, availableInBag);
        
        for (let i = 0; i < take; i++) {
          result.push(bag[currentIndex + i]);
        }
        
        piecesNeeded -= take;
        currentIndex += take;
        
        if (piecesNeeded > 0) {
          refillBag();
          currentIndex = 0;
        }
      }
      
      return result;
    },

    reset(): void {
      bag = [];
      bagIndex = 0;
    }
  };
}

export { createRandomizer };