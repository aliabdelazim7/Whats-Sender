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

    // Verify key nav tabs (both desktop and mobile docks rendered)
    expect(screen.getAllByText(/لوحة التحكم|Dashboard/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/جهات الاتصال|Contacts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/محرر الرسائل|Message Composer/i).length).toBeGreaterThan(0);
  });

  it('switches between Arabic and English seamlessly', async () => {
    render(<App />);

    const langToggleBtn = await screen.findByTitle(/Toggle Language/i);
    expect(langToggleBtn).toBeInTheDocument();

    fireEvent.click(langToggleBtn);

    // After clicking, should be in English
    await waitFor(() => {
      expect(document.documentElement.getAttribute('dir')).toBe('ltr');
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Contacts').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Message Composer').length).toBeGreaterThan(0);
    });
  });

  it('navigates to settings and message composer tabs', async () => {
    render(<App />);

    const [composerTab] = await screen.findAllByText(/محرر الرسائل|Message Composer/i);
    fireEvent.click(composerTab);

    await waitFor(() => {
      expect(
        screen.getByText(/محرر وقوالب الرسائل|Message Template Composer/i)
      ).toBeInTheDocument();
    });
  });
});
