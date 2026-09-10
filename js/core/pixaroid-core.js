/**
 * Pixaroid Core Engine v2.1
 * Legacy compatibility kernel for the standalone v2 tool family.
 *
 * Current static tools use /js/engine.js. This compatibility file intentionally
 * preserves the old global API used by the standalone v2 pages.
 */
(function (root) {
    'use strict';

    const CONFIG = Object.freeze({
        MAX_FILE_SIZE: 100 * 1024 * 1024,
        MAX_BATCH_SIZE: 100,
        TIMEOUT: 120000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        QUALITY_MIN: 0.1,
        QUALITY_MAX: 1.0,
        QUALITY_STEP: 0.05,
        PREVIEW_THUMBNAIL_SIZE: 200,
        SUPPORTED_FORMATS: Object.freeze(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'pdf']),
        COMPRESSION_PRESETS: Object.freeze({
            low: Object.freeze({ quality: 0.3, label: 'Low (Smallest)' }),
            medium: Object.freeze({ quality: 0.6, label: 'Medium (Balanced)' }),
            high: Object.freeze({ quality: 0.85, label: 'High (Best Quality)' }),
            lossless: Object.freeze({ quality: 1.0, label: 'Lossless' })
        })
    });

    class EventBus {
        constructor() { this.events = new Map(); }
        on(event, callback) {
            if (typeof callback !== 'function') return () => {};
            if (!this.events.has(event)) this.events.set(event, new Set());
            this.events.get(event).add(callback);
            return () => this.off(event, callback);
        }
        off(event, callback) {
            const set = this.events.get(event);
            if (!set) return;
            set.delete(callback);
            if (!set.size) this.events.delete(event);
        }
        emit(event, data) {
            const set = this.events.get(event);
            if (!set) return;
            [...set].forEach(callback => {
                try { callback(data); } catch (error) { console.error(`Event handler error for ${event}:`, error); }
            });
        }
        clear(event = null) {
            if (event === null) this.events.clear();
            else this.events.delete(event);
        }
    }

    class StateManager {
        constructor(initialState = {}) {
            this.initialState = { ...initialState };
            this.state = { ...initialState };
            this.listeners = new Set();
        }
        getState() { return { ...this.state }; }
        setState(newState = {}) {
            if (!newState || typeof newState !== 'object') return this.getState();
            const previous = this.getState();
            this.state = { ...this.state, ...newState };
            this.notifyListeners(previous, this.state);
            return this.getState();
        }
        subscribe(listener) {
            if (typeof listener !== 'function') return () => {};
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }
        notifyListeners(previous, current) {
            [...this.listeners].forEach(listener => {
                try { listener({ ...current }, { ...previous }); } catch (error) { console.error('State listener error:', error); }
            });
        }
        reset() {
            const previous = this.getState();
            this.state = { ...this.initialState };
            this.notifyListeners(previous, this.state);
            return this.getState();
        }
    }

    class Logger {
        constructor(prefix = 'Pixaroid') {
            this.prefix = prefix;
            this.enabled = true;
            this.levels = Object.freeze({ DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 });
            this.currentLevel = this.levels.DEBUG;
        }
        log(level, message, data = undefined) {
            if (!this.enabled || level < this.currentLevel) return;
            const levelName = Object.keys(this.levels).find(key => this.levels[key] === level) || 'INFO';
            const prefix = `[${new Date().toISOString()}] [${this.prefix}] [${levelName}]`;
            const sink = level >= this.levels.ERROR ? console.error : level >= this.levels.WARN ? console.warn : console.log;
            if (data !== undefined) sink.call(console, `${prefix} ${message}`, data);
            else sink.call(console, `${prefix} ${message}`);
        }
        debug(message, data) { this.log(this.levels.DEBUG, message, data); }
        info(message, data) { this.log(this.levels.INFO, message, data); }
        warn(message, data) { this.log(this.levels.WARN, message, data); }
        error(message, data) { this.log(this.levels.ERROR, message, data); }
        setLevel(level) { if (Number.isFinite(level)) this.currentLevel = level; }
        enable() { this.enabled = true; }
        disable() { this.enabled = false; }
    }

    class FileValidator {
        static validate(file, options = {}) {
            const errors = [];
            const maxSize = Number.isFinite(options.maxSize) ? options.maxSize : CONFIG.MAX_FILE_SIZE;
            const allowedTypes = Array.isArray(options.allowedTypes) ? options.allowedTypes : CONFIG.SUPPORTED_FORMATS;
            if (!(file instanceof Blob)) {
                return { valid: false, errors: [{ type: 'INVALID_FILE', message: 'A valid File or Blob is required.' }], warnings: [] };
            }
            if (file.size > maxSize) errors.push({ type: 'SIZE_EXCEEDED', message: `File "${file.name || 'file'}" exceeds maximum size of ${this.formatBytes(maxSize)}`, file: file.name });
            const extension = this.getFileExtension(file.name || '').toLowerCase();
            const normalizedAllowed = allowedTypes.map(type => String(type).toLowerCase().replace(/^\./, ''));
            if (extension && normalizedAllowed.length && !normalizedAllowed.includes(extension)) {
                errors.push({ type: 'UNSUPPORTED_FORMAT', message: `File "${file.name || 'file'}" has unsupported format (.${extension})`, file: file.name });
            }
            if (file.size === 0) errors.push({ type: 'EMPTY_FILE', message: `File "${file.name || 'file'}" is empty`, file: file.name });
            return { valid: errors.length === 0, errors, warnings: [] };
        }
        static validateBatch(files, options = {}) {
            const list = Array.from(files || []);
            const results = { valid: [], invalid: [], errors: [], warnings: [] };
            const maxBatch = Number.isFinite(options.maxBatchSize) ? options.maxBatchSize : CONFIG.MAX_BATCH_SIZE;
            if (list.length > maxBatch) {
                results.errors.push({ type: 'BATCH_SIZE_EXCEEDED', message: `Maximum ${maxBatch} files allowed` });
                return results;
            }
            list.forEach(file => {
                const validation = this.validate(file, options);
                if (validation.valid) results.valid.push(file);
                else { results.invalid.push(file); results.errors.push(...validation.errors); }
                results.warnings.push(...validation.warnings);
            });
            return results;
        }
        static getFileExtension(filename = '') {
            const clean = String(filename).split(/[?#]/, 1)[0];
            const dot = clean.lastIndexOf('.');
            return dot > -1 ? clean.slice(dot + 1) : '';
        }
        static formatBytes(bytes) {
            const value = Number(bytes);
            if (!Number.isFinite(value) || value <= 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.min(Math.floor(Math.log(value) / Math.log(k)), sizes.length - 1);
            return `${parseFloat((value / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
        }
    }

    class PerformanceMonitor {
        constructor() { this.metrics = new Map(); }
        start(label) { this.metrics.set(label, { startTime: typeof performance !== 'undefined' ? performance.now() : Date.now() }); }
        end(label) {
            const metric = this.metrics.get(label);
            if (!metric) return null;
            const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
            metric.endTime = endTime;
            metric.duration = Math.max(0, endTime - metric.startTime);
            return metric.duration;
        }
        getMetrics(label) { return this.metrics.get(label) || null; }
        getAllMetrics() { return Object.fromEntries(this.metrics.entries()); }
        report() {
            const operations = {};
            this.metrics.forEach((metric, label) => {
                operations[label] = { duration: metric.duration ?? null, startTime: metric.startTime, endTime: metric.endTime ?? null };
            });
            return { timestamp: new Date().toISOString(), operations };
        }
        clear() { this.metrics.clear(); }
    }

    const eventBus = new EventBus();
    const logger = new Logger('PixaroidCore');
    const performanceMonitor = new PerformanceMonitor();

    const PixaroidCore = {
        CONFIG,
        EventBus,
        StateManager,
        Logger,
        FileValidator,
        PerformanceMonitor,
        eventBus,
        logger,
        performanceMonitor,
        utils: {
            formatBytes: FileValidator.formatBytes,
            getFileExtension: FileValidator.getFileExtension,
            generateId() {
                if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `pix_${crypto.randomUUID()}`;
                return `pix_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
            },
            debounce(func, wait) {
                let timeout = null;
                return function (...args) {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func.apply(this, args), Math.max(0, Number(wait) || 0));
                };
            },
            throttle(func, limit) {
                let last = 0;
                let timeout = null;
                let trailingArgs = null;
                return function (...args) {
                    const delay = Math.max(0, Number(limit) || 0);
                    const now = Date.now();
                    if (now - last >= delay) { last = now; func.apply(this, args); return; }
                    trailingArgs = args;
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        last = Date.now();
                        func.apply(this, trailingArgs || []);
                        trailingArgs = null;
                    }, delay - (now - last));
                };
            },
            async sleep(ms) { return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0))); },
            isMobile() { return typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); },
            isOnline() { return typeof navigator === 'undefined' || navigator.onLine; }
        },
        version: '2.1.0',
        buildDate: 'static-compatibility'
    };

    root.PixaroidCore = PixaroidCore;
    if (typeof module !== 'undefined' && module.exports) module.exports = PixaroidCore;
})(typeof window !== 'undefined' ? window : globalThis);
