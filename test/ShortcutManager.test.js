import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShortcutManager } from '../src/core/ShortcutManager.js'
import { SettingsManager } from '../src/core/SettingsManager.js'

describe('ShortcutManager', () => {
  let shortcutManager
  let settingsManager
  let mockCallback

  beforeEach(() => {
    vi.clearAllMocks()
    settingsManager = new SettingsManager()
    mockCallback = vi.fn()
    shortcutManager = new ShortcutManager(settingsManager)
  })

  describe('constructor', () => {
    it('should initialize with settings manager', () => {
      expect(shortcutManager.settingsManager).toBe(settingsManager)
      expect(shortcutManager.actions).toBeInstanceOf(Map)
      expect(shortcutManager.activeShortcuts).toBeInstanceOf(Map)
    })

    it('should setup event listeners', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      new ShortcutManager(settingsManager)
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('registerAction', () => {
    it('should register action with callback and description', () => {
      shortcutManager.registerAction('testAction', mockCallback, 'Test action')
      
      const action = shortcutManager.actions.get('testAction')
      expect(action).toBeDefined()
      expect(action.callback).toBe(mockCallback)
      expect(action.description).toBe('Test action')
      expect(action.id).toBe('testAction')
    })
  })

  describe('unregisterAction', () => {
    it('should remove registered action', () => {
      shortcutManager.registerAction('testAction', mockCallback, 'Test action')
      expect(shortcutManager.actions.has('testAction')).toBe(true)
      
      shortcutManager.unregisterAction('testAction')
      expect(shortcutManager.actions.has('testAction')).toBe(false)
    })
  })

  describe('getShortcutFromEvent', () => {
    it('should generate shortcut string from keyboard event', () => {
      const event = {
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        key: 'N'
      }
      
      const shortcut = shortcutManager.getShortcutFromEvent(event)
      expect(shortcut).toBe('Ctrl+N')
    })

    it('should handle multiple modifiers', () => {
      const event = {
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
        key: 'A'
      }
      
      const shortcut = shortcutManager.getShortcutFromEvent(event)
      expect(shortcut).toBe('Ctrl+Alt+Shift+A')
    })

    it('should handle special keys', () => {
      const event = {
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: 'F5'
      }
      
      const shortcut = shortcutManager.getShortcutFromEvent(event)
      expect(shortcut).toBe('F5')
    })

    it('should handle arrow keys', () => {
      const event = {
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        key: 'ArrowUp'
      }
      
      const shortcut = shortcutManager.getShortcutFromEvent(event)
      expect(shortcut).toBe('Ctrl+Up')
    })

    it('should handle meta key as Ctrl', () => {
      const event = {
        ctrlKey: false,
        metaKey: true,
        altKey: false,
        shiftKey: false,
        key: 'S'
      }
      
      const shortcut = shortcutManager.getShortcutFromEvent(event)
      expect(shortcut).toBe('Ctrl+S')
    })
  })

  describe('updateShortcuts', () => {
    it('should update active shortcuts from settings', () => {
      shortcutManager.registerAction('newFile', mockCallback, 'New file')
      shortcutManager.updateShortcuts()
      
      expect(shortcutManager.activeShortcuts.get('Ctrl+N')).toBe('newFile')
    })

    it('should only include shortcuts for registered actions', () => {
      shortcutManager.updateShortcuts()
      
      // Should not include shortcuts for unregistered actions
      expect(shortcutManager.activeShortcuts.has('Ctrl+N')).toBe(false)
    })

    it('should clear previous shortcuts before updating', () => {
      shortcutManager.registerAction('newFile', mockCallback, 'New file')
      shortcutManager.updateShortcuts()
      
      const initialSize = shortcutManager.activeShortcuts.size
      
      shortcutManager.unregisterAction('newFile')
      shortcutManager.updateShortcuts()
      
      expect(shortcutManager.activeShortcuts.size).toBeLessThan(initialSize)
    })
  })

  describe('handleKeyDown', () => {
    beforeEach(() => {
      shortcutManager.registerAction('newFile', mockCallback, 'New file')
      shortcutManager.updateShortcuts()
    })

    it('should execute callback for matching shortcut', () => {
      const event = {
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        key: 'N',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }
      
      shortcutManager.handleKeyDown(event)
      
      expect(mockCallback).toHaveBeenCalled()
      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('should not execute callback for non-matching shortcut', () => {
      const event = {
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        key: 'X',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }
      
      shortcutManager.handleKeyDown(event)
      
      expect(mockCallback).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error')
      })
      
      shortcutManager.registerAction('errorAction', errorCallback, 'Error action')
      settingsManager.setShortcut('errorAction', 'Ctrl+E')
      shortcutManager.updateShortcuts()
      
      const event = {
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        key: 'E',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      }
      
      expect(() => {
        shortcutManager.handleKeyDown(event)
      }).not.toThrow()
      
      expect(errorCallback).toHaveBeenCalled()
    })
  })

  describe('getActionDescription', () => {
    it('should return description for registered action', () => {
      shortcutManager.registerAction('testAction', mockCallback, 'Test description')
      
      const description = shortcutManager.getActionDescription('testAction')
      expect(description).toBe('Test description')
    })

    it('should return action id for unregistered action', () => {
      const description = shortcutManager.getActionDescription('nonExistent')
      expect(description).toBe('nonExistent')
    })
  })

  describe('getAllActions', () => {
    it('should return all registered actions', () => {
      shortcutManager.registerAction('action1', vi.fn(), 'Action 1')
      shortcutManager.registerAction('action2', vi.fn(), 'Action 2')
      
      const actions = shortcutManager.getAllActions()
      expect(actions).toHaveLength(2)
      expect(actions.map(a => a.id)).toContain('action1')
      expect(actions.map(a => a.id)).toContain('action2')
    })
  })

  describe('settings integration', () => {
    it('should update shortcuts when settings change', () => {
      shortcutManager.registerAction('newFile', mockCallback, 'New file')
      
      // Change shortcut in settings
      settingsManager.setShortcut('newFile', 'Alt+N')
      
      // Should automatically update active shortcuts
      expect(shortcutManager.activeShortcuts.get('Alt+N')).toBe('newFile')
      expect(shortcutManager.activeShortcuts.has('Ctrl+N')).toBe(false)
    })
  })
})