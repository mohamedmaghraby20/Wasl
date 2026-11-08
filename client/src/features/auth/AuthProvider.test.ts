import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './AuthProvider';

describe('authErrorMessage', () => {
  it('does not reveal whether an email is registered', () => {
    expect(authErrorMessage(new Error('User already registered'), {
      invalidCredentials: 'Invalid credentials',
      weakPassword: 'Choose a stronger password',
      generic: 'Please try again',
    })).toBe('Please try again');
  });
});
