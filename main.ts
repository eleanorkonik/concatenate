import {
	App, HeadingCache, MetadataCache, Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from 'obsidian';

interface MyPluginSettings {
	concatHeader: string;
	pathIncluded: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	concatHeader: '## Reading Log',
	pathIncluded: ''
}
async function asyncForEach(array:TFile[], callback: (markFile: TFile) => void) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index]);
	}
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async performConcatenation() {
		let markdownFiles = this.app.vault.getMarkdownFiles();
		if (this.settings.pathIncluded) {
		    markdownFiles = markdownFiles.filter(e => e.path.startsWith(this.settings.pathIncluded))
		}

		if (!markdownFiles.length) {
		    new Notice("Can't find files which fit the filter")
            return
		}

		let content = Array();
		let timenow = Date.now();
		// Await lets you block further execution until this thing is done. It must be paired with async.

		const level = this.settings.concatHeader.split(' ').filter(e => /^#/.test(e))[0]?.split('#').length - 1 || 0
		const title = this.settings.concatHeader.split(' ').slice(1).join(' ')

		await asyncForEach(markdownFiles, async (markFile: TFile) => {
		    const metadata = this.app.metadataCache.getFileCache(markFile)

			type HeadingWithOffset = [HeadingCache, { sectionEndLine: number }]

			const matchedHeadings: HeadingWithOffset[] = metadata.headings
					?.filter(h => h.level >= level)
					.map((h, i, arr) => {
						return [
							h,
							{ sectionEndLine: arr[i + 1]?.position.start.line || undefined }
						] as HeadingWithOffset
					})
					.filter(h => h[0].level === level && h[0].heading === title)
				|| []

			if (matchedHeadings.length) {
				const fileContent = await this.app.vault.read(markFile)
				content.push(
					matchedHeadings.map(h => {
						return fileContent
							.split('\n')
							.slice(h[0].position.start.line + 1, h[1].sectionEndLine)
							.join('\n')
					}).join('\n')
				)
			}
		});

		const finalizedContents = content.join('\n')

		await this.app.vault.create("Concatenated_Note-" + timenow + ".md", finalizedContents);
		new Notice('File: "' + 'Concatenated_Note-' + timenow + '.md' + '" created.');
	}

	async onload() {
		console.log('loading plugin');

		await this.loadSettings();

		this.addCommand({
			id: 'concatenate-headings',
			name: 'Concatenate Headings',
			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking) {
							this.performConcatenation();
					}
					return true;
				}
				return false;
			},
			callback: () => this.performConcatenation(),
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Heading Title')
			.setDesc('Type the heading (including the hashtags) you would like to concatenate')
			.addText(text => text
				.setValue(this.plugin.settings.concatHeader)
				.onChange(async (value) => {
					this.plugin.settings.concatHeader = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Folder in which search for')
			.setDesc('Specify the folder where plugin will search headers')
			.addText(text => text
				.setPlaceholder('path/folder/deep')
				.setValue(this.plugin.settings.pathIncluded)
				.onChange(async (value) => {
					this.plugin.settings.pathIncluded = value;
					await this.plugin.saveSettings();
				}));
	}
}
