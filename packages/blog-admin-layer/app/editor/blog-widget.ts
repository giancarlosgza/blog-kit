import type { NodeViewProps } from '@tiptap/vue-3'
import type { Component } from 'vue'
import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import BlogWidgetNodeView from '#admin/app/components/blog/BlogWidgetNodeView.vue'

/**
 * Tiptap node for an embedded interactive widget.
 *
 * Serializes to EXACTLY the contract the public site hydrates:
 *   <div data-blog-widget="<key>" data-props='<json>'></div>
 *
 * `parseHTML` ↔ `renderHTML` round-trips that markup so editing an existing post's
 * HTML preserves embeds. In the editor it renders a non-interactive preview (NodeView).
 */
export const BlogWidget = Node.create({
  name: 'blogWidget',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      widgetKey: {
        default: '',
        parseHTML: el => (el as HTMLElement).getAttribute('data-blog-widget') || '',
        renderHTML: (attrs) => {
          if (!attrs.widgetKey)
            return {}
          return { 'data-blog-widget': attrs.widgetKey }
        }
      },
      props: {
        default: {},
        parseHTML: (el) => {
          try {
            return JSON.parse((el as HTMLElement).getAttribute('data-props') || '{}')
          } catch {
            return {}
          }
        },
        renderHTML: attrs => ({ 'data-props': JSON.stringify(attrs.props ?? {}) })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-blog-widget]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(BlogWidgetNodeView as Component<NodeViewProps>)
  }
})
