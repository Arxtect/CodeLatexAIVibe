import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SettingsManager } from '../src/core/SettingsManager.js'

describe('SettingsManager', () => {
  let settingsManager

  beforeEach(() => {
    // Clear localStorage mock before each test
    vi.clearAllMocks()
    localStorage.clear()
    settingsManager = new SettingsManager()
  })

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(settingsManager.settings).toBeDefined()
      expect(settingsManager.settings.shortcuts).toBeDefined()
      expect(settingsManager.settings.plugins).toBeDefined()
      expect(settingsManager.settings.editor).toBeDefined()
      expect(settingsManager.settings.ui).toBeDefined()
      expect(settingsManager.settings.performance).toBeDefined()
    })

    it('should have default shortcuts', () => {
      const shortcuts = settingsManager.settings.shortcuts
      expect(shortcuts.newFile).toBe('Ctrl+N')
      expect(shortcuts.saveFile).toBe('Ctrl+S')
      expect(shortcuts.compile).toBe('F5')
    })

    it('should have default editor settings', () => {
      const editor = settingsManager.settings.editor
      expect(editor.fontSize).toBe(14)
      expect(editor.theme).toBe('latex-dark')
      expect(editor.wordWrap).toBe('on')
      expect(editor.minimap).toBe(true)
    })
  })

  describe('get', () => {
    it('should return setting value for valid category and key', () => {
      expect(settingsManager.get('editor', 'fontSize')).toBe(14)
      expect(settingsManager.get('shortcuts', 'newFile')).toBe('Ctrl+N')
      expect(settingsManager.get('ui', 'sidebarWidth')).toBe(250)
    })

    it('should return undefined for invalid category or key', () => {
      expect(settingsManager.get('invalid', 'path')).toBeUndefined()
      expect(settingsManager.get('editor', 'invalidProperty')).toBeUndefined()
    })

    it('should return entire section when key is not provided', () => {
      const editorSettings = settingsManager.get('editor')
      expect(editorSettings).toEqual(settingsManager.settings.editor)
    })
  })

  describe('set', () => {
    it('should set setting value for valid category and key', () => {
      settingsManager.set('editor', 'fontSize', 16)
      expect(settingsManager.get('editor', 'fontSize')).toBe(16)

      settingsManager.set('shortcuts', 'newFile', 'Ctrl+Alt+N')
      expect(settingsManager.get('shortcuts', 'newFile')).toBe('Ctrl+Alt+N')
    })

    it('should create new category if it does not exist', () => {
      settingsManager.set('newSection', 'newProperty', 'testValue')
      expect(settingsManager.get('newSection', 'newProperty')).toBe('testValue')
    })

    it('should handle batch setting with object', () => {
      settingsManager.set('editor', { fontSize: 18, theme: 'light' })
      expect(settingsManager.get('editor', 'fontSize')).toBe(18)
      expect(settingsManager.get('editor', 'theme')).toBe('light')
    })

    it('should call saveSettings after setting a value', () => {
      const saveSettingsSpy = vi.spyOn(settingsManager, 'saveSettings')
      settingsManager.set('editor', 'fontSize', 18)
      expect(saveSettingsSpy).toHaveBeenCalled()
    })
  })

  describe('resetSettings', () => {
    it('should reset all settings to defaults', () => {
      // Modify some settings
      settingsManager.set('editor', 'fontSize', 20)
      settingsManager.set('shortcuts', 'newFile', 'Alt+N')
      
      // Reset settings
      settingsManager.resetSettings()
      
      // Check that settings are back to defaults
      expect(settingsManager.get('editor', 'fontSize')).toBe(14)
      expect(settingsManager.get('shortcuts', 'newFile')).toBe('Ctrl+N')
    })

    it('should call saveSettings after reset', () => {
      const saveSettingsSpy = vi.spyOn(settingsManager, 'saveSettings')
      settingsManager.resetSettings()
      expect(saveSettingsSpy).toHaveBeenCalled()
    })
  })

  describe('exportSettings', () => {
    it('should return JSON string of current settings', () => {
      const exported = settingsManager.exportSettings()
      const parsed = JSON.parse(exported)
      expect(parsed).toEqual(settingsManager.settings)
    })

    it('should handle circular references gracefully', () => {
      // Add a circular reference
      settingsManager.settings.circular = settingsManager.settings
      
      expect(() => {
        settingsManager.exportSettings()
      }).toThrow('Converting circular structure to JSON')
    })
  })

  describe('importSettings', () => {
    it('should import valid JSON settings', () => {
      const newSettings = {
        editor: { fontSize: 18, theme: 'light' },
        shortcuts: { newFile: 'Alt+N' }
      }
      
      const result = settingsManager.importSettings(JSON.stringify(newSettings))
      
      expect(result).toBe(true)
      expect(settingsManager.get('editor', 'fontSize')).toBe(18)
      expect(settingsManager.get('editor', 'theme')).toBe('light')
      expect(settingsManager.get('shortcuts', 'newFile')).toBe('Alt+N')
    })

    it('should return false for invalid JSON', () => {
      const result = settingsManager.importSettings('invalid json')
      expect(result).toBe(false)
    })

    it('should call saveSettings after successful import', () => {
      const saveSettingsSpy = vi.spyOn(settingsManager, 'saveSettings')
      const newSettings = { editor: { fontSize: 16 } }
      
      settingsManager.importSettings(JSON.stringify(newSettings))
      expect(saveSettingsSpy).toHaveBeenCalled()
    })
  })

  describe('getShortcut', () => {
    it('should return shortcut for valid action', () => {
      expect(settingsManager.getShortcut('newFile')).toBe('Ctrl+N')
      expect(settingsManager.getShortcut('saveFile')).toBe('Ctrl+S')
    })

    it('should return undefined for invalid action', () => {
      expect(settingsManager.getShortcut('invalidAction')).toBeUndefined()
    })
  })

  describe('setShortcut', () => {
    it('should set shortcut for valid action', () => {
      settingsManager.setShortcut('newFile', 'Alt+N')
      expect(settingsManager.getShortcut('newFile')).toBe('Alt+N')
    })

    it('should call saveSettings after setting shortcut', () => {
      const saveSettingsSpy = vi.spyOn(settingsManager, 'saveSettings')
      settingsManager.setShortcut('newFile', 'Alt+N')
      expect(saveSettingsSpy).toHaveBeenCalled()
    })
  })

  describe('resetShortcuts', () => {
    it('should reset all shortcuts to defaults', () => {
      // Modify shortcuts
      settingsManager.setShortcut('newFile', 'Alt+N')
      settingsManager.setShortcut('saveFile', 'Alt+S')
      
      // Reset shortcuts
      settingsManager.resetShortcuts()
      
      // Check that shortcuts are back to defaults
      expect(settingsManager.getShortcut('newFile')).toBe('Ctrl+N')
      expect(settingsManager.getShortcut('saveFile')).toBe('Ctrl+S')
    })
  })

  describe('plugin management', () => {
    it('should enable plugin', () => {
      settingsManager.enablePlugin('test-plugin')
      expect(settingsManager.isPluginEnabled('test-plugin')).toBe(true)
      expect(settingsManager.settings.plugins.enabled).toContain('test-plugin')
    })

    it('should disable plugin', () => {
      settingsManager.enablePlugin('test-plugin')
      settingsManager.disablePlugin('test-plugin')
      expect(settingsManager.isPluginEnabled('test-plugin')).toBe(false)
      expect(settingsManager.settings.plugins.disabled).toContain('test-plugin')
    })

    it('should get plugin config', () => {
      const config = { setting1: 'value1' }
      settingsManager.setPluginConfig('test-plugin', config)
      expect(settingsManager.getPluginConfig('test-plugin')).toEqual(config)
    })

    it('should return empty object for non-existent plugin config', () => {
      expect(settingsManager.getPluginConfig('non-existent')).toEqual({})
    })
  })

  describe('shortcut conflict detection', () => {
    it('should detect shortcut conflicts', () => {
      const conflict = settingsManager.findShortcutConflict('Ctrl+N', 'someOtherAction')
      expect(conflict).toBe('newFile')
    })

    it('should not detect conflict for same action', () => {
      const conflict = settingsManager.findShortcutConflict('Ctrl+N', 'newFile')
      expect(conflict).toBeNull()
    })

    it('should throw error when setting conflicting shortcut', () => {
      expect(() => {
        settingsManager.setShortcut('someAction', 'Ctrl+N')
      }).toThrow('快捷键 "Ctrl+N" 已被 "newFile" 使用')
    })
  })

  describe('event system', () => {
    it('should register and trigger event listeners', () => {
      const callback = vi.fn()
      settingsManager.on('settingsChanged', callback)
      
      settingsManager.set('editor', 'fontSize', 16)
      
      expect(callback).toHaveBeenCalledWith(settingsManager.settings)
    })

    it('should remove event listeners', () => {
      const callback = vi.fn()
      settingsManager.on('settingsChanged', callback)
      settingsManager.off('settingsChanged', callback)
      
      settingsManager.set('editor', 'fontSize', 16)
      
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle multiple listeners for same event', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      
      settingsManager.on('settingsChanged', callback1)
      settingsManager.on('settingsChanged', callback2)
      
      settingsManager.set('editor', 'fontSize', 16)
      
      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })
  })

  describe('performance settings', () => {
    it('should have default performance thresholds', () => {
      const perf = settingsManager.settings.performance
      expect(perf.warningFileSize).toBe(500 * 1024)
      expect(perf.maxFileSize).toBe(2 * 1024 * 1024)
      expect(perf.contextFileLimit).toBe(1024 * 1024)
      expect(perf.previewLength).toBe(2000)
    })

    it('should allow updating performance settings', () => {
      settingsManager.set('performance', 'maxFileSize', 5 * 1024 * 1024)
      expect(settingsManager.get('performance', 'maxFileSize')).toBe(5 * 1024 * 1024)
    })
  })
})