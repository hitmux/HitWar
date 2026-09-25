import { describe, expect, it } from 'vitest';

import {
  ValidationErrorCode,
  validationFailure,
  validationSuccess,
} from './types.js';

describe('validation result helpers', () => {
  it('creates success results with optional data', () => {
    expect(validationSuccess()).toEqual({ valid: true, data: undefined });
    expect(validationSuccess({ cost: 50, id: 'x' })).toEqual({
      valid: true,
      data: { cost: 50, id: 'x' },
    });
  });

  it('creates failure results with explicit or default messages', () => {
    expect(validationFailure(ValidationErrorCode.PLAYER_NOT_FOUND)).toEqual({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_FOUND,
      errorMessage: ValidationErrorCode.PLAYER_NOT_FOUND,
    });

    expect(validationFailure(ValidationErrorCode.INSUFFICIENT_MONEY, 'Need 10')).toEqual({
      valid: false,
      errorCode: ValidationErrorCode.INSUFFICIENT_MONEY,
      errorMessage: 'Need 10',
    });
  });

  it('keeps validation error code values stable and unique', () => {
    const codes = Object.values(ValidationErrorCode);

    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain('PLAYER_NOT_FOUND');
    expect(codes).toContain('TOWER_TYPE_INVALID');
    expect(codes).toContain('SPAWNER_NOT_FOUND');
    expect(codes).toContain('CANNON_NO_AMMO');
  });
});
