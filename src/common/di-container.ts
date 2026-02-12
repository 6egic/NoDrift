/** Dependency injection container. */

interface ServiceDescriptor<T = unknown> {
  factory: () => T;
  singleton: boolean;
}

export class Container {
  private services = new Map<string, ServiceDescriptor>();
  private singletons = new Map<string, unknown>();

  /**
   * Register service factory.
   */
  register<T>(key: string, factory: () => T, singleton: boolean = false): void {
    this.services.set(key, { factory, singleton });
  }

  /**
   * Resolve service by key.
   */
  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not found: ${key}`);
    }

    // Return singleton if already created
    if (service.singleton && this.singletons.has(key)) {
      return this.singletons.get(key) as T;
    }

    // Create instance
    const instance = service.factory();

    // Store singleton
    if (service.singleton) {
      this.singletons.set(key, instance);
    }

    return instance as T;
  }

  /**
   * Check if service is registered.
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clear all services.
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }
}
