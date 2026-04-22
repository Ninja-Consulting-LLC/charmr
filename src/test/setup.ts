/**
 * Global test setup file
 * This file registers all mocks that will be used across test files.
 * All mocks are defined in the ./mocks directory and registered here.
 */

import './mocks/firebaseNative';
import {registerMocks} from './mocks';

registerMocks();
