import { configureStore } from "@reduxjs/toolkit";

export const store=configureStore({
    // Placeholder until the RTK Query API slice lands; an empty reducer map logs an error on every render.
    reducer:{
        app:(state:Record<string,never>={})=>state,
    },
});

export type RootState=ReturnType<typeof store.getState>;
export type AppDispatch=typeof store.dispatch;
