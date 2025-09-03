import { log } from '@/utils/logger';
/**
 * 🚀 State Serialization Utilities
 * 
 * Phase 6B: Handles complex state objects and references for component hydration.
 * Provides safe serialization/deserialization with versioning and validation.
 */

// Serialized state interface
export interface SerializedState {
  data: any;
  metadata: {
    version: string;
    timestamp: number;
    componentId: string;
    userId: string;
    checksum: string;
    references: StateReference[];
  };
}

// State reference for handling circular references
export interface StateReference {
  id: string;
  path: string;
  type: 'object' | 'array' | 'function' | 'symbol' | 'undefined';
  value?: any;
}

// Serialization options
export interface SerializationOptions {
  maxDepth?: number;
  includeFunctions?: boolean;
  includeSymbols?: boolean;
  customSerializers?: Map<string, (value: any) => any>;
  customDeserializers?: Map<string, (value: any) => any>;
}

// Default serialization options
const DEFAULT_OPTIONS: Required<SerializationOptions> = {
  maxDepth: 10,
  includeFunctions: false,
  includeSymbols: false,
  customSerializers: new Map(),
  customDeserializers: new Map()
};

class StateSerializer {
  private referenceMap = new Map<string, any>();
  private referenceCounter = 0;

  /**
   * 🔄 SERIALIZE STATE
   * Converts complex state objects to cache-friendly format
   */
  serialize(
    state: any,
    componentId: string,
    userId: string,
    options: SerializationOptions = {}
  ): SerializedState {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.referenceMap.clear();
    this.referenceCounter = 0;

    try {
      const serializedData = this.serializeValue(state, opts, 0);
      const checksum = this.generateChecksum(serializedData);

      const result: SerializedState = {
        data: serializedData,
        metadata: {
          version: '1.0.0',
          timestamp: Date.now(),
          componentId,
          userId,
          checksum,
          references: Array.from(this.referenceMap.entries()).map(([id, value]) => ({
            id,
            path: value.path,
            type: this.getType(value.value),
            value: this.serializeValue(value.value, opts, 0)
          }))
        }
      };

      log.debug('Utils', `🔄 [StateSerializer] Serialized state for ${componentId} (${checksum})`);
      return result;

    } catch (error) {
      log.error('Utils', `🚨 [StateSerializer] Serialization failed for ${componentId}:`, error);
      throw new Error(`State serialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🔄 DESERIALIZE STATE
   * Converts serialized state back to original format
   */
  deserialize(serializedState: SerializedState, options: SerializationOptions = {}): any {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
      // Validate checksum
      const expectedChecksum = this.generateChecksum(serializedState.data);
      if (expectedChecksum !== serializedState.metadata.checksum) {
        throw new Error('State checksum validation failed - data may be corrupted');
      }

      // Rebuild reference map
      this.referenceMap.clear();
      serializedState.metadata.references.forEach(ref => {
        this.referenceMap.set(ref.id, {
          path: ref.path,
          value: this.deserializeValue(ref.value, opts)
        });
      });

      // Deserialize main data
      const result = this.deserializeValue(serializedState.data, opts);
      
      log.debug('Utils', `🔄 [StateSerializer] Deserialized state for ${serializedState.metadata.componentId}`);
      return result;

    } catch (error) {
      log.error('Utils', `🚨 [StateSerializer] Deserialization failed:`, error);
      throw new Error(`State deserialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * ✅ VALIDATE STATE VERSION
   * Checks if serialized state is compatible with current version
   */
  validateVersion(serializedState: SerializedState): boolean {
    const currentVersion = '1.0.0';
    const stateVersion = serializedState.metadata.version;
    
    // For now, only support exact version match
    // In future, could implement version migration logic
    return stateVersion === currentVersion;
  }

  /**
   * 🧹 CLEAN STATE
   * Removes sensitive or unnecessary data from state
   */
  cleanState(state: any, sensitiveKeys: string[] = []): any {
    if (typeof state !== 'object' || state === null) {
      return state;
    }

    if (Array.isArray(state)) {
      return state.map(item => this.cleanState(item, sensitiveKeys));
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(state)) {
      // Skip sensitive keys
      if (sensitiveKeys.includes(key)) {
        continue;
      }

      // Skip functions and symbols
      if (typeof value === 'function' || typeof value === 'symbol') {
        continue;
      }

      // Recursively clean nested objects
      cleaned[key] = this.cleanState(value, sensitiveKeys);
    }

    return cleaned;
  }

  // =================== PRIVATE METHODS ===================

  private serializeValue(value: any, options: Required<SerializationOptions>, depth: number): any {
    // Check depth limit
    if (depth > options.maxDepth) {
      return { __serializationError: 'Max depth exceeded' };
    }

    // Handle null and undefined
    if (value === null || value === undefined) {
      return { __type: 'null', __value: value };
    }

    // Handle primitives
    if (typeof value !== 'object') {
      if (typeof value === 'function') {
        if (!options.includeFunctions) {
          return { __type: 'function', __value: null };
        }
        return { __type: 'function', __value: value.toString() };
      }
      
      if (typeof value === 'symbol') {
        if (!options.includeSymbols) {
          return { __type: 'symbol', __value: null };
        }
        return { __type: 'symbol', __value: value.toString() };
      }

      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return {
        __type: 'array',
        __value: value.map((item, index) => this.serializeValue(item, options, depth + 1))
      };
    }

    // Handle objects
    if (value.constructor === Object) {
      const serialized: any = {};
      for (const [key, val] of Object.entries(value)) {
        serialized[key] = this.serializeValue(val, options, depth + 1);
      }
      return serialized;
    }

    // Handle special objects (Date, RegExp, etc.)
    if (value instanceof Date) {
      return { __type: 'Date', __value: value.toISOString() };
    }

    if (value instanceof RegExp) {
      return { __type: 'RegExp', __value: { source: value.source, flags: value.flags } };
    }

    if (value instanceof Error) {
      return { 
        __type: 'Error', 
        __value: { 
          name: value.name, 
          message: value.message, 
          stack: value.stack 
        } 
      };
    }

    // Handle circular references
    const referenceId = this.findCircularReference(value);
    if (referenceId) {
      return { __type: 'reference', __value: referenceId };
    }

    // Store reference for complex objects
    const id = `ref_${this.referenceCounter++}`;
    this.referenceMap.set(id, { path: '', value });

    // Serialize the object
    const serialized: any = { __type: 'object', __value: {} };
    for (const [key, val] of Object.entries(value)) {
      serialized.__value[key] = this.serializeValue(val, options, depth + 1);
    }

    return serialized;
  }

  private deserializeValue(value: any, options: Required<SerializationOptions>): any {
    // Handle primitive values
    if (value === null || value === undefined || typeof value !== 'object') {
      return value;
    }

    // Handle special type markers
    if (value.__type) {
      switch (value.__type) {
        case 'null':
          return value.__value;
        case 'array':
          return value.__value.map((item: any) => this.deserializeValue(item, options));
        case 'function':
          return value.__value ? new Function('return ' + value.__value)() : null;
        case 'symbol':
          return value.__value ? Symbol(value.__value) : null;
        case 'Date':
          return new Date(value.__value);
        case 'RegExp':
          return new RegExp(value.__value.source, value.__value.flags);
        case 'Error':
          const error = new Error(value.__value.message);
          error.name = value.__value.name;
          error.stack = value.__value.stack;
          return error;
        case 'reference':
          const ref = this.referenceMap.get(value.__value);
          return ref ? ref.value : null;
        case 'object':
          const deserialized: any = {};
          for (const [key, val] of Object.entries(value.__value)) {
            deserialized[key] = this.deserializeValue(val, options);
          }
          return deserialized;
        default:
          return value;
      }
    }

    // Handle regular objects
    const deserialized: any = {};
    for (const [key, val] of Object.entries(value)) {
      deserialized[key] = this.deserializeValue(val, options);
    }
    return deserialized;
  }

  private findCircularReference(value: any): string | null {
    for (const [id, ref] of this.referenceMap.entries()) {
      if (ref.value === value) {
        return id;
      }
    }
    return null;
  }

  private getType(value: any): StateReference['type'] {
    if (value === null || value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'function') return 'function';
    if (typeof value === 'symbol') return 'symbol';
    return 'object';
  }

  private generateChecksum(data: any): string {
    // Simple checksum for validation
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

// Export singleton instance
export const stateSerializer = new StateSerializer();

// Export types
export type { SerializedState, StateReference, SerializationOptions };
