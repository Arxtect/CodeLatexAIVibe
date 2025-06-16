import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentPluginBase } from '../src/plugins/AgentPluginBase.js'

// Create a concrete implementation for testing
class TestAgent extends AgentPluginBase {
  constructor() {
    super()
    this.id = 'test-agent'
    this.name = 'Test Agent'
    this.description = 'A test agent for unit testing'
    this.capabilities = ['test', 'mock']
  }

  async processMessage(message, context) {
    return `Processed: ${message}`
  }

  onInit() {
    this.initCalled = true
  }

  onEnable() {
    this.enableCalled = true
  }

  onDisable() {
    this.disableCalled = true
  }

  onDestroy() {
    this.destroyCalled = true
  }
}

describe('AgentPluginBase', () => {
  let agent
  let mockPluginManager

  beforeEach(() => {
    vi.clearAllMocks()
    agent = new TestAgent()
    mockPluginManager = {
      getPlugin: vi.fn(),
      registerPlugin: vi.fn(),
      getPluginConfig: vi.fn(() => ({})),
      setPluginConfig: vi.fn()
    }
    
    // Mock window.ide
    global.window = {
      ide: {
        settingsManager: {
          getPluginConfig: vi.fn(() => ({})),
          setPluginConfig: vi.fn()
        },
        editor: {
          getValue: vi.fn(() => 'test content'),
          getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
          getSelection: vi.fn(() => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 })),
          getModel: vi.fn(() => ({ getLanguageId: () => 'latex' }))
        },
        currentFile: '/test.tex'
      }
    }
  })

  describe('constructor', () => {
    it('should initialize with default properties', () => {
      expect(agent.id).toBe('test-agent')
      expect(agent.name).toBe('Test Agent')
      expect(agent.description).toBe('A test agent for unit testing')
      expect(agent.version).toBe('1.0.0')
      expect(agent.type).toBe('agent')
      expect(agent.enabled).toBe(true)
      expect(agent.capabilities).toEqual(['test', 'mock'])
      expect(agent.isExecuting).toBe(false)
      expect(agent.executionHistory).toEqual([])
    })
  })

  describe('init', () => {
    it('should initialize plugin with plugin manager', () => {
      agent.init(mockPluginManager)
      
      expect(agent.pluginManager).toBe(mockPluginManager)
      expect(agent.ide).toBe(global.window.ide)
      expect(agent.initCalled).toBe(true)
    })

    it('should load configuration during init', () => {
      const loadConfigSpy = vi.spyOn(agent, 'loadConfiguration')
      agent.init(mockPluginManager)
      
      expect(loadConfigSpy).toHaveBeenCalled()
    })
  })

  describe('enable', () => {
    it('should enable the agent', () => {
      agent.enable()
      
      expect(agent.enabled).toBe(true)
      expect(agent.enableCalled).toBe(true)
    })
  })

  describe('disable', () => {
    it('should disable the agent', () => {
      agent.disable()
      
      expect(agent.enabled).toBe(false)
      expect(agent.disableCalled).toBe(true)
    })
  })

  describe('destroy', () => {
    it('should destroy the agent', () => {
      agent.destroy()
      
      expect(agent.destroyCalled).toBe(true)
    })
  })

  describe('processMessage', () => {
    it('should process message correctly', async () => {
      const result = await agent.processMessage('test message', {})
      expect(result).toBe('Processed: test message')
    })
  })

  describe('configuration management', () => {
    beforeEach(() => {
      mockPluginManager.getPluginConfig = vi.fn(() => ({}))
      mockPluginManager.setPluginConfig = vi.fn()
      agent.init(mockPluginManager)
    })

    it('should load configuration', () => {
      const mockConfig = { setting1: 'value1' }
      mockPluginManager.getPluginConfig.mockReturnValue(mockConfig)
      
      agent.loadConfiguration()
      
      expect(agent.config).toEqual(expect.objectContaining(mockConfig))
      expect(mockPluginManager.getPluginConfig).toHaveBeenCalledWith('test-agent')
    })

    it('should get configuration', () => {
      const mockConfig = { setting1: 'value1', setting2: 'value2' }
      mockPluginManager.getPluginConfig.mockReturnValue(mockConfig)
      
      expect(agent.getConfig()).toEqual(mockConfig)
      expect(agent.getConfig('setting1')).toBe('value1')
    })

    it('should set configuration', () => {
      agent.setConfig('newKey', 'newValue')
      expect(mockPluginManager.setPluginConfig).toHaveBeenCalledWith('test-agent', { newKey: 'newValue' })
      
      agent.setConfig({ key1: 'value1', key2: 'value2' })
      expect(mockPluginManager.setPluginConfig).toHaveBeenCalledWith('test-agent', { key1: 'value1', key2: 'value2' })
    })
  })

  describe('response and action creation', () => {
    it('should create response object', () => {
      const response = agent.createResponse('Test content', ['action1'])
      
      expect(response).toEqual({
        content: 'Test content',
        actions: ['action1'],
        timestamp: expect.any(String),
        agentId: 'test-agent'
      })
    })

    it('should create action object', () => {
      const action = agent.createAction('test', { key: 'value' })
      
      expect(action).toEqual({
        type: 'test',
        data: { key: 'value' },
        timestamp: expect.any(String),
        agentId: 'test-agent'
      })
    })

    it('should create file creation action', () => {
      const action = agent.createCreateAction('/test.tex', 'content')
      
      expect(action).toEqual({
        type: 'create',
        data: { filePath: '/test.tex', content: 'content' },
        timestamp: expect.any(String),
        agentId: 'test-agent'
      })
    })

    it('should create file edit action', () => {
      const edits = [{ range: [1, 1, 1, 5], text: 'new' }]
      const action = agent.createEditAction('/test.tex', edits)
      
      expect(action).toEqual({
        type: 'edit',
        data: { filePath: '/test.tex', edits },
        timestamp: expect.any(String),
        agentId: 'test-agent'
      })
    })

    it('should create file delete action', () => {
      const action = agent.createDeleteAction('/test.tex')
      
      expect(action).toEqual({
        type: 'delete',
        data: { filePath: '/test.tex' },
        timestamp: expect.any(String),
        agentId: 'test-agent'
      })
    })

    it('should create UI action', () => {
      const action = agent.createUIAction('open', { file: '/test.tex' })
      
      expect(action).toEqual({
        type: 'ui',
        data: { action: 'open', params: { file: '/test.tex' } },
        timestamp: expect.any(String),
        agentId: 'test-agent'
      })
    })
  })

  describe('execution management', () => {
    it('should add to execution history', () => {
      agent.addToHistory('Test action', 'action', 'target')
      
      expect(agent.executionHistory).toHaveLength(1)
      expect(agent.executionHistory[0]).toEqual({
        timestamp: expect.any(String),
        description: 'Test action',
        type: 'action',
        target: 'target'
      })
    })

    it('should limit execution history size', () => {
      // Fill history beyond limit (101 entries to trigger trimming)
      for (let i = 0; i < 101; i++) {
        agent.addToHistory(`test${i}`, 'action', 'target')
      }
      
      expect(agent.executionHistory.length).toBe(50) // Trimmed to 50
    })

    it('should get recent history', () => {
      for (let i = 0; i < 15; i++) {
        agent.addToHistory(`test${i}`, 'action', 'target')
      }
      
      const recent = agent.getRecentHistory(5)
      expect(recent).toHaveLength(5)
      expect(recent[4].description).toBe('test14') // Most recent
    })
  })

  describe('error handling', () => {
    it('should handle execution errors gracefully', async () => {
      const errorAgent = new AgentPluginBase()
      
      await expect(errorAgent.processMessage('test', {})).rejects.toThrow('子类必须实现 processMessage 方法')
    })

    it('should handle and log errors', () => {
      const error = new Error('Test error')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      agent.handleError(error, 'test context')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Agent Test Agent 错误 [test context]:'),
        error
      )
      expect(agent.executionHistory).toHaveLength(1)
      expect(agent.executionHistory[0].description).toBe('错误: Test error')
    })
  })

  describe('logging', () => {
    it('should log messages with different levels', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      agent.log('info', 'Info message')
      agent.log('warn', 'Warning message')
      agent.log('error', 'Error message')
      
      expect(consoleSpy).toHaveBeenCalledWith('[Test Agent] Info message', null)
      expect(warnSpy).toHaveBeenCalledWith('[Test Agent] Warning message', null)
      expect(errorSpy).toHaveBeenCalledWith('[Test Agent] Error message', null)
    })
  })

  describe('context management', () => {
    it('should get editor context', () => {
      agent.ide = global.window.ide
      const context = agent.getEditorContext()
      
      expect(context).toEqual({
        filePath: '/test.tex',
        content: 'test content',
        position: { lineNumber: 1, column: 1 },
        selection: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
        language: 'latex'
      })
    })

    it('should return null when no editor available', () => {
      agent.ide = null
      const context = agent.getEditorContext()
      expect(context).toBeNull()
    })

    it('should get project context', () => {
      agent.ide = global.window.ide
      const context = agent.getProjectContext()
      expect(context).toBeDefined()
    })
  })
})