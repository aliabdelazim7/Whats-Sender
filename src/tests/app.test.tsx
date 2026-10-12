import React from 'react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('App Integration Flow', () => {
  it('renders application title and default dashboard widgets', async () => {
    render(<App />);

    // Wait for local data load to finish
    const titleElement = await screen.findByText(/مساعد مراسلات إكسل|Excel Messaging Assistant/i);
    expect(titleElement).toBeInTheDocument();

    // Verify key nav tabs
    expect(screen.getByText(/لوحة التحكم|Dashboard/i)).toBeInTheDocument();
    expect(screen.getAllByText(/جهات الاتصال|Contacts/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/محرر الرسائل|Message Composer/i)).toBeInTheDocument();
  });

  it('switches between Arabic and English seamlessly', async () => {
    render(<App />);

    const langToggleBtn = await screen.findByTitle(/Toggle Language/i);
    expect(langToggleBtn).toBeInTheDocument();

    fireEvent.click(langToggleBtn);

    // After clicking, should be in English
    await waitFor(() => {
      expect(document.documentElement.getAttribute('dir')).toBe('ltr');
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Contacts')).toBeInTheDocument();
      expect(screen.getByText('Message Composer')).toBeInTheDocument();
    });
  });

  it('navigates to settings and message composer tabs', async () => {
    render(<App />);

    const composerTab = await screen.findByText(/محرر الرسائل|Message Composer/i);
    fireEvent.click(composerTab);

    await waitFor(() => {
      expect(
        screen.getByText(/محرر وقوالب الرسائل|Message Template Composer/i)
      ).toBeInTheDocument();
    });
  });
});
