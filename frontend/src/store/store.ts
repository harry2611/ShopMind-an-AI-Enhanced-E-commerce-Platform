import { configureStore } from '@reduxjs/toolkit';
import { personalizationReducer } from './personalizationSlice';

export const store = configureStore({
  reducer: {
    personalization: personalizationReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
