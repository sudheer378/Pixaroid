/**
 * Pixaroid Core Engine v2.0
 * Next-generation image processing architecture
 * Features: Module pattern, dependency injection, event bus, state management
 */

const PixaroidCore = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
        MAX_BATCH_SIZE: 100,
        TIMEOUT: 120000, // 2 minutes
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        QUALITY_MIN: 0.1,
        QUALITY_MAX: 1.0,
        QUALITY_STEP: 0.05,
        PREVIEW_THUMBNAIL_SIZE: 200,
        SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'pdf'],
        COMPRESSION_PRESETS: {
            low: { quality: 0.3, label: 'Low (Smallest)' },
            medium: { quality: 0.6, label: 'Medium (Balanced)' },
            high: { quality: 0.85, label: 'High (Best Quality)' },
            lossless: { quality: 1.0, label: 'Lossless' }
        }
    };

    // Event Bus for decoupled communication
    class EventBus {
        constructor() {
            this.events = new Map();
        }

        on(event, callback) {
            if (!this.events.has(event)) {
                this.events.set(event, []);
            }
            this.events.get(event).push(callback);
            return () => this.off(event, callback);
        }

        off(event, callback) {
            if (this.events.has(event)) {
                const callbacks = this.events.get(event);
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        }

        emit(event, data) {
            if (this.events.has(event)) {
                this.events.get(event).forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Event handler error for ${event}:`, error);
                    }
                });
            }
        }

        clear() {
            this.events.clear();
        }
    }

    // State Management
    class StateManager {
        constructor(initialState = {}) {
            this.state = { ...initialState };
            this.listeners = new Set();
        }

        getState() {
            return { ...this.state };
        }

        setState(newState) {
            const prevState = { ...this.state };
            this.state = { ...this.state, ...newState };
            this.notifyListeners(prevState, this.state);
        }

        subscribe(listener) {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }

        notifyListeners(prevState, currentState) {
            this.listeners.forEach(listener => {
                try {
                    listener(currentState, prevState);
                } catch (error) {
                    console.error('State listener error:', error);
                }
            });
        }

        reset() {
            const prevState = { ...this.state };
            this.state = {};
            this.notifyListeners(prevState, this.state);
        }
    }

    // Logger with levels
    class Logger {
        constructor(prefix = 'Pixaroid') {
            this.prefix = prefix;
            this.enabled = true;
            this.levels = {
                DEBUG: 0,
                INFO: 1,
                WARN: 2,
                ERROR: 3
            };
            this.currentLevel = this.levels.DEBUG;
        }

        log(level, message, data = null) {
            if (!this.enabled || level < this.currentLevel) return;

            const timestamp = new Date().toISOString();
            const levelName = Object.keys(this.levels).find(key => this.levels[key] === level);
            const prefix = `[${timestamp}] [${this.prefix}] [${levelName}]`;

            if (data !== null) {
                console.log(`${prefix} ${message}`, data);
            } else {
                console.log(`${prefix} ${message}`);
            }
        }

        debug(message, data) { this.log(this.levels.DEBUG, message, data); }
        info(message, data) { this.log(this.levels.INFO, message, data); }
        warn(message, data) { this.log(this.levels.WARN, message, data); }
        error(message, data) { this.log(this.levels.ERROR, message, data); }

        setLevel(level) { this.currentLevel = level; }
        enable() { this.enabled = true; }
        disable() { this.enabled = false; }
    }

    // File Validator
    class FileValidator {
        static validate(file, options = {}) {
            const errors = [];
            const {
                maxSize = CONFIG.MAX_FILE_SIZE,
                allowedTypes = CONFIG.SUPPORTED_FORMATS,
                allowMultiple = true
            } = options;

            // Size validation
            if (file.size > maxSize) {
                errors.push({
                    type: 'SIZE_EXCEEDED',
                    message: `File "${file.name}" exceeds maximum size of ${this.formatBytes(maxSize)}`,
                    file: file.name
                });
            }

            // Type validation
            const extension = this.getFileExtension(file.name).toLowerCase();
            if (!allowedTypes.includes(extension)) {
                errors.push({
                    type: 'UNSUPPORTED_FORMAT',
                    message: `File "${file.name}" has unsupported format (.${extension})`,
                    file: file.name
                });
            }

            // Corrupted file check
            if (file.size === 0) {
                errors.push({
                    type: 'EMPTY_FILE',
                    message: `File "${file.name}" is empty`,
                    file: file.name
                });
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings: []
            };
        }

        static validateBatch(files, options = {}) {
            const results = {
                valid: [],
                invalid: [],
                errors: [],
                warnings: []
            };

            if (files.length > CONFIG.MAX_BATCH_SIZE) {
                results.errors.push({
                    type: 'BATCH_SIZE_EXCEEDED',
                    message: `Maximum ${CONFIG.MAX_BATCH_SIZE} files allowed`
                });
                return results;
            }

            files.forEach(file => {
                const validation = this.validate(file, options);
                if (validation.valid) {
                    results.valid.push(file);
                } else {
                    results.invalid.push(file);
                    results.errors.push(...validation.errors);
                }
            });

            return results;
        }

        static getFileExtension(filename) {
            return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
        }

        static formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    }

    // Performance Monitor
    class PerformanceMonitor {
        constructor() {
            this.metrics = new Map();
            this.startTime = null;
        }

        start(label) {
            this.startTime = performance.now();
            this.metrics.set(label, { startTime: this.startTime });
        }

        end(label) {
            const endTime = performance.now();
            const metric = this.metrics.get(label);
            if (metric && metric.startTime) {
                const duration = endTime - metric.startTime;
                metric.duration = duration;
                metric.endTime = endTime;
                this.metrics.set(label, metric);
                return duration;
            }
            return null;
        }

        getMetrics(label) {
            return this.metrics.get(label) || null;
        }

        getAllMetrics() {
            const allMetrics = {};
            this.metrics.forEach((value, key) => {
                allMetrics[key] = value;
            });
            return allMetrics;
        }

        report() {
            const report = {
                timestamp: new Date().toISOString(),
                operations: {}
            };

            this.metrics.forEach((metric, label) => {
                report.operations[label] = {
                    duration: metric.duration || null,
                    startTime: metric.startTime,
                    endTime: metric.endTime
                };
            });

            return report;
        }

        clear() {
            this.metrics.clear();
            this.startTime = null;
        }
    }

    // Initialize global instances
    const eventBus = new EventBus();
    const logger = new Logger('PixaroidCore');
    const performanceMonitor = new PerformanceMonitor();

    // Public API
    return {
        CONFIG,
        EventBus,
        StateManager,
        Logger,
        FileValidator,
        PerformanceMonitor,
        
        // Global instances
        eventBus,
        logger,
        performanceMonitor,

        // Utility functions
        utils: {
            formatBytes: FileValidator.formatBytes,
            getFileExtension: FileValidator.getFileExtension,
            
            generateId() {
                return 'pix_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            },

            debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            },

            throttle(func, limit) {
                let inThrottle;
                return function(...args) {
                    if (!inThrottle) {
                        func.apply(this, args);
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, limit);
                    }
                };
            },

            async sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            },

            isMobile() {
                return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            },

            isOnline() {
                return navigator.onLine;
            }
        },

        // Version info
        version: '2.0.0',
        buildDate: new Date().toISOString()
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PixaroidCore;
}

// Auto-initialize
console.log(`🚀 Pixaroid Core v${PixaroidCore.version} initialized`);
