/**
 * Vitest polyfills for Node 18 to satisfy newer web platform APIs that jsdom expects.
 */
(() => {
  const descriptor = Object.getOwnPropertyDescriptor(
    ArrayBuffer.prototype,
    'resizable',
  );
  if (!descriptor) {
    Object.defineProperty(ArrayBuffer.prototype, 'resizable', {
      configurable: true,
      enumerable: false,
      get() {
        return false;
      },
    });
  }

  if (typeof SharedArrayBuffer === 'function') {
    const growableDescriptor = Object.getOwnPropertyDescriptor(
      SharedArrayBuffer.prototype,
      'growable',
    );
    if (!growableDescriptor) {
      Object.defineProperty(SharedArrayBuffer.prototype, 'growable', {
        configurable: true,
        enumerable: false,
        get() {
          return false;
        },
      });
    }

    const sharedMaxByteLengthDescriptor = Object.getOwnPropertyDescriptor(
      SharedArrayBuffer.prototype,
      'maxByteLength',
    );
    if (!sharedMaxByteLengthDescriptor) {
      Object.defineProperty(SharedArrayBuffer.prototype, 'maxByteLength', {
        configurable: true,
        enumerable: false,
        get() {
          return this.byteLength;
        },
      });
    }
  }

  const maxByteLengthDescriptor = Object.getOwnPropertyDescriptor(
    ArrayBuffer.prototype,
    'maxByteLength',
  );
  if (!maxByteLengthDescriptor) {
    Object.defineProperty(ArrayBuffer.prototype, 'maxByteLength', {
      configurable: true,
      enumerable: false,
      get() {
        return this.byteLength;
      },
    });
  }
})();
