import {tokens} from '../tokens';

describe('design-system tokens', () => {
  it('has stable spacing scale', () => {
    expect(tokens.space.md).toBe(12);
    expect(tokens.space['2xl']).toBe(24);
  });

  it('defines dark canvas colors', () => {
    expect(tokens.color.canvas.default).toMatch(/^#/);
    expect(tokens.color.surface.default).toMatch(/^#/);
  });

  it('type scale uses literal weights', () => {
    expect(tokens.type.title.weight).toBe('600');
  });
});
