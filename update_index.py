import re

with open('src/routes/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add draw button after cards button
content = content.replace(
    '<button\n                  onClick={() => setView("cards")}\n                  className={view === "cards" ? "text-foreground" : "hover:text-foreground"}\n                >\n                  cards ({cards.length})\n                </button>',
    '<button\n                  onClick={() => setView("cards")}\n                  className={view === "cards" ? "text-foreground" : "hover:text-foreground"}\n                >\n                  cards ({cards.length})\n                </button>\n                <span className="mx-2">·</span>\n                <button\n                  onClick={() => setView("draw")}\n                  className={view === "draw" ? "text-foreground" : "hover:text-foreground"}\n                >\n                  draw\n                </button>'
)

# Add drawing view after the cards view
# Find the end of the cards view and add the draw view
old_view_logic = '''          )}
        </main>'''

new_view_logic = '''          )}
          {view === "draw" && (
            <DrawingCanvas roomId={activeId} canEdit={canEdit} />
          )}
        </main>'''

content = content.replace(old_view_logic, new_view_logic)

with open('src/routes/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')