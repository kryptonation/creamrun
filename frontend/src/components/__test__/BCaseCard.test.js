import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BCaseCard from '../BCaseCard';

describe('BCaseCard Component', () => {
    const mockData = {
        label: 'Test Case Title',
        value: 'Test Case Description',
    };

    test('renders BCaseCard component', () => {
        render(<BCaseCard {...mockData} />);
        expect(screen.getByText('Test Case Title')).toBeInTheDocument();
        expect(screen.getByText('Test Case Description')).toBeInTheDocument();
    });
});