import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product, UserEvent } from '../types/shop';

type PersonalizationState = {
  events: UserEvent[];
  recommended: Product[];
  recentlyViewed: Product[];
  recentSearches: string[];
};

const initialState: PersonalizationState = {
  events: [],
  recommended: [],
  recentlyViewed: [],
  recentSearches: []
};

const slice = createSlice({
  name: 'personalization',
  initialState,
  reducers: {
    trackLocalEvent(state, action: PayloadAction<UserEvent>) {
      state.events.unshift(action.payload);
      state.events = state.events.slice(0, 80);
      if (action.payload.event_type === 'search' && typeof action.payload.metadata?.query === 'string') {
        state.recentSearches = [
          action.payload.metadata.query,
          ...state.recentSearches.filter((query) => query !== action.payload.metadata?.query)
        ].slice(0, 6);
      }
    },
    viewedProduct(state, action: PayloadAction<Product>) {
      state.recentlyViewed = [
        action.payload,
        ...state.recentlyViewed.filter((product) => product.id !== action.payload.id)
      ].slice(0, 8);
    },
    setRecommended(state, action: PayloadAction<Product[]>) {
      state.recommended = action.payload;
    }
  }
});

export const { trackLocalEvent, viewedProduct, setRecommended } = slice.actions;
export const personalizationReducer = slice.reducer;
