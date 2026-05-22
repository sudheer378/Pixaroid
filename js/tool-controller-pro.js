/**
 * Pixaroid Pro Tool Controller
 * Integrates Pro Engine, Advanced Workers, and Premium UI
 */

class ToolControllerPro {
    constructor(toolType, settings = {}) {
        this.toolType = toolType;
        this.settings = settings;
        this.engine = null;
        this.ui = null;
        this.processedFiles = [];
        
        this.init();
    }

    init() {
        this.ui = new PremiumUI('tool-container');
        this.ui.init();
        
        this.engine = new PixaroidProEngine({
            onProgress: (percent) => this.ui.updateProgress(percent),
            onComplete: (results) => this.handleComplete(results),
            onError: (error, file) => this.handleError(error, file)
        });

        window.addEventListener('files-selected', (e) => {
            this.processFiles(e.detail);
        });

        document.getElementById('downloadAll')?.addEventListener('click', () => this.downloadAll());
    }

    async processFiles(files) {
        const settings = {
            operation: this.toolType,
            ...this.settings
        };

        try {
            const results = await this.engine.processFiles(files, settings);
            this.processedFiles = results;
        } catch (error) {
            alert('Processing failed: ' + error.message);
        }
    }

    handleComplete(results) {
        results.forEach((result, index) => {
            if (result.status === 'completed') {
                this.ui.updateFileStatus(index, 'Completed', '✓ Done');
            } else if (result.status === 'failed') {
                this.ui.updateFileStatus(index, 'Failed', result.error);
            }
        });

        this.ui.showActions();
    }

    handleError(error, file) {
        console.error('Error processing', file.name, error);
    }

    async downloadAll() {
        const completed = this.processedFiles.filter(r => r.status === 'completed');
        
        if (completed.length === 1) {
            const a = document.createElement('a');
            a.href = completed[0].result;
            a.download = 'processed-' + Date.now();
            a.click();
        } else if (completed.length > 1) {
            // ZIP download logic would go here
            alert('ZIP download for multiple files coming soon!');
        }
    }
}

window.ToolControllerPro = ToolControllerPro;
