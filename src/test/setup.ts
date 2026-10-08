import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { useUiStore } from '../store/uiStore';

// The first-visit tour would otherwise sit on top of every rendered app.
beforeEach(() => useUiStore.setState({ tourSeen: true }));

afterEach(() => cleanup());
