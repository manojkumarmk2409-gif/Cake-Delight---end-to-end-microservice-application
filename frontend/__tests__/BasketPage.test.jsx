jest.mock('../src/services/api.js', () => ({
    getBasket: jest.fn(),
    updateBasketItem: jest.fn(),
    removeFromBasket: jest.fn(),
    checkout: jest.fn()
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { BasketProvider } from '../src/context/BasketContext.jsx';
import BasketPage from '../src/pages/BasketPage.jsx';
import * as api from '../src/services/api.js';

const mockItems = [
    { cakeId: 'c1', name: 'Chocolate Cake', price: 25.00, quantity: 2 },
    { cakeId: 'c2', name: 'Strawberry Cake', price: 30.00, quantity: 1 }
];
const mockBasketResponse = { data: { data: { items: mockItems, total: 80 } } };
const emptyBasketResponse = { data: { data: { items: [], total: 0 } } };

describe('BasketPage', () => {
    afterEach(() => jest.clearAllMocks());

    const renderPage = () => render(
        <MemoryRouter>
            <BasketProvider>
                <BasketPage />
            </BasketProvider>
        </MemoryRouter>
    );

    it('should show empty state when basket is empty', async () => {
        api.getBasket.mockResolvedValue(emptyBasketResponse);
        renderPage();
        await waitFor(() => expect(screen.getByText('Your basket is empty')).toBeInTheDocument());
    });

    it('should display basket items and total', async () => {
        api.getBasket.mockResolvedValue(mockBasketResponse);
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
            expect(screen.getByText('Strawberry Cake')).toBeInTheDocument();
        });
    });

    it('should update quantity when + is clicked', async () => {
        api.getBasket.mockResolvedValue(mockBasketResponse);
        api.updateBasketItem.mockResolvedValue({});
        renderPage();
        await waitFor(() => screen.getByText('Chocolate Cake'));
        const plusButtons = screen.getAllByText('+');
        fireEvent.click(plusButtons[0]);
        expect(api.updateBasketItem).toHaveBeenCalled();
    });

    it('should remove item when ✕ button is clicked', async () => {
        api.getBasket.mockResolvedValue(mockBasketResponse);
        api.removeFromBasket.mockResolvedValue({});
        renderPage();
        await waitFor(() => screen.getByText('Chocolate Cake'));
        const removeButtons = screen.getAllByText('✕');
        fireEvent.click(removeButtons[0]);
        expect(api.removeFromBasket).toHaveBeenCalled();
    });

    it('should call checkout API and navigate on success', async () => {
        api.getBasket.mockResolvedValue(mockBasketResponse);
        api.checkout.mockResolvedValue({ data: { data: { _id: 'order-1', items: mockItems, totalAmount: 80, status: 'confirmed' } } });
        renderPage();
        await waitFor(() => screen.getByText('✅ Checkout'));
        fireEvent.change(screen.getByPlaceholderText('Delivery Address'), { target: { value: '123 Main St' } });
        fireEvent.click(screen.getByText('✅ Checkout'));
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/checkout/confirm', expect.anything()));
    });

    it('should show error when checkout fails', async () => {
        api.getBasket.mockResolvedValue(mockBasketResponse);
        api.checkout.mockRejectedValue({ response: { data: { error: 'Basket is empty' } } });
        renderPage();
        await waitFor(() => screen.getByText('✅ Checkout'));
        fireEvent.change(screen.getByPlaceholderText('Delivery Address'), { target: { value: '123 Main St' } });
        fireEvent.click(screen.getByText('✅ Checkout'));
        await waitFor(() => expect(screen.getByText('Basket is empty')).toBeInTheDocument());
    });
});
