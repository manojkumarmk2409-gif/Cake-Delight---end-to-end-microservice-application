import { createContext, useContext, useMemo, useReducer, useCallback } from 'react';

const BasketContext = createContext();

const initialState = {
    items: []
};

const basketReducer = (state, action) => {
    switch (action.type) {
        case 'SET_BASKET':
            return { ...state, items: action.payload };
        case 'CLEAR_BASKET':
            return { ...state, items: [] };
        default:
            return state;
    }
};

export const BasketProvider = ({ children }) => {
    const [state, dispatch] = useReducer(basketReducer, initialState);

    const setBasket = useCallback((items) => {
        dispatch({ type: 'SET_BASKET', payload: items });
    }, []);

    const clearBasket = useCallback(() => {
        dispatch({ type: 'CLEAR_BASKET' });
    }, []);

    const totalItems = useMemo(
        () => state.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        [state.items]
    );
    const totalAmount = useMemo(
        () => state.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
        [state.items]
    );

    const value = useMemo(() => ({
        ...state,
        setBasket,
        clearBasket,
        totalItems,
        totalAmount
    }), [state, setBasket, clearBasket, totalItems, totalAmount]);

    return (
        <BasketContext.Provider value={value}>
            {children}
        </BasketContext.Provider>
    );
};

export const useBasket = () => {
    const ctx = useContext(BasketContext);
    if (!ctx) throw new Error('useBasket must be used inside BasketProvider');
    return ctx;
};
