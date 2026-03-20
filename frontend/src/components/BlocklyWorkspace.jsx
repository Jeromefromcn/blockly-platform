import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

const TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category', name: 'Logic', colour: '#5C81A6',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
      ]
    },
    {
      kind: 'category', name: 'Loops', colour: '#5CA65C',
      contents: [
        { kind: 'block', type: 'controls_repeat_ext' },
        { kind: 'block', type: 'controls_whileUntil' },
        { kind: 'block', type: 'controls_for' },
        { kind: 'block', type: 'controls_forEach' },
      ]
    },
    {
      kind: 'category', name: 'Math', colour: '#5C68A6',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_modulo' },
        { kind: 'block', type: 'math_round' },
        { kind: 'block', type: 'math_single' },
      ]
    },
    {
      kind: 'category', name: 'Text', colour: '#5CA68D',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_join' },
        { kind: 'block', type: 'text_length' },
        { kind: 'block', type: 'text_print' },
        { kind: 'block', type: 'text_append' },
      ]
    },
    { kind: 'category', name: 'Variables', colour: '#A65C81', custom: 'VARIABLE' },
    { kind: 'category', name: 'Functions', colour: '#9A5CA6', custom: 'PROCEDURE' },
    {
      kind: 'category', name: 'Lists', colour: '#745CA6',
      contents: [
        { kind: 'block', type: 'lists_create_empty' },
        { kind: 'block', type: 'lists_create_with' },
        { kind: 'block', type: 'lists_length' },
        { kind: 'block', type: 'lists_getIndex' },
        { kind: 'block', type: 'lists_setIndex' },
      ]
    },
  ]
};

export default function BlocklyWorkspace({ onWorkspaceReady, initialState, readOnly = false }) {
  const containerRef = useRef(null);
  const workspaceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: readOnly ? null : TOOLBOX,
      scrollbars: true,
      trashcan: !readOnly,
      readOnly,
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 2, minScale: 0.5 },
      grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
    });

    workspaceRef.current = workspace;

    if (initialState) {
      try {
        const state = typeof initialState === 'string' ? JSON.parse(initialState) : initialState;
        Blockly.serialization.workspaces.load(state, workspace);
      } catch (e) {
        console.error('Failed to load Blockly state:', e);
      }
    }

    if (onWorkspaceReady) {
      onWorkspaceReady({
        getState: () => Blockly.serialization.workspaces.save(workspace),
        getCode: () => javascriptGenerator.workspaceToCode(workspace),
        clear: () => workspace.clear(),
        loadState: (state) => {
          try {
            const s = typeof state === 'string' ? JSON.parse(state) : state;
            Blockly.serialization.workspaces.load(s, workspace);
          } catch (e) {
            console.error('Failed to load state:', e);
          }
        },
      });
    }

    return () => workspace.dispose();
  }, []);

  return (
    <div ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 400, border: '1px solid #e2e8f0', borderRadius: 8 }} />
  );
}
