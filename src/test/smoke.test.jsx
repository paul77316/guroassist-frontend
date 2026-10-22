import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function SmokeComponent() {
  return <p>Test environment ready</p>;
}

describe('frontend test setup', () => {
  it('renders a React component', () => {
    render(<SmokeComponent />);
    expect(screen.getByText('Test environment ready')).toBeInTheDocument();
  });
});
