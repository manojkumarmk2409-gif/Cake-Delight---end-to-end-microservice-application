// Mock the api module
jest.mock('../src/services/api.js', () => ({
    getCakes: jest.fn(),
    addToBasket: jest.fn(),
    getBasket: jest.fn()
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }) => children,
    NavLink: ({ children, to, className }) => <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className}>{children}</a>
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { BasketProvider } from '../src/context/BasketContext.jsx';
import CatalogPage from '../src/pages/CatalogPage.jsx';
import * as api from '../src/services/api.js';

const mockCakes = [
    { _id: '1', name: 'Chocolate Dream', description: 'Rich chocolate cake description here', category: 'Chocolate', price: 29.99, availability: true, imageUrl: '' },
    { _id: '2', name: 'Strawberry Bliss', description: 'Light strawberry cake description here', category: 'Fruit', price: 24.99, availability: true, imageUrl: '' },
    { _id: '3', name: 'Lemon Zest', description: 'Tangy lemon cake description here', category: 'Citrus', price: 19.99, availability: false, imageUrl: '' }
];

describe('CatalogPage', () => {
    beforeEach(() => {
        api.getCakes.mockResolvedValue({ data: { data: mockCakes } });
        api.addToBasket.mockResolvedValue({});
        api.getBasket.mockResolvedValue({ data: { data: { items: [] } } });
    });

    afterEach(() => jest.clearAllMocks());

    const renderPage = () => render(
        <MemoryRouter>
            <BasketProvider>
                <CatalogPage />
            </BasketProvider>
        </MemoryRouter>
    );

    it('should render catalog page and display cakes', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Chocolate Dream')).toBeInTheDocument();
            expect(screen.getByText('Strawberry Bliss')).toBeInTheDocument();
            expect(screen.getByText('Lemon Zest')).toBeInTheDocument();
        });
    });

    it('should show loading spinner initially', () => {
        renderPage();
        expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('should show unavailable badge for unavailable cakes', async () => {
        renderPage();
        await waitFor(() => expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0));
    });

    it('should show error message when API fails', async () => {
        api.getCakes.mockRejectedValueOnce(new Error('Network error'));
        renderPage();
        await waitFor(() => expect(screen.getByText(/Failed to load cakes/)).toBeInTheDocument());
    });

    it('should show empty state when no cakes match filter', async () => {
        api.getCakes.mockResolvedValueOnce({ data: { data: [] } });
        renderPage();
        await waitFor(() => expect(screen.getByText('No cakes found')).toBeInTheDocument());
    });

    it('should call getCakes with filter params when searching', async () => {
        renderPage();
        await waitFor(() => screen.getByText('Chocolate Dream'));
        const searchInput = screen.getByPlaceholderText('Cake name…');
        fireEvent.change(searchInput, { target: { value: 'Chocolate' } });
        await waitFor(() => {
            expect(api.getCakes).toHaveBeenCalledWith(expect.objectContaining({ name: 'Chocolate' }));
        });
    });

    it('should clear filters when Clear button clicked', async () => {
        renderPage();
        await waitFor(() => screen.getByText('Chocolate Dream'));
        const searchInput = screen.getByPlaceholderText('Cake name…');
        fireEvent.change(searchInput, { target: { value: 'test' } });
        fireEvent.click(screen.getByText('Clear'));
        expect(searchInput.value).toBe('');
    });
});
