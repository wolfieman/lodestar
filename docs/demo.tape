# docs/demo.tape — record the README demo GIF with vhs (https://github.com/charmbracelet/vhs)
#
#   Run from the repo root:   vhs docs/demo.tape   ->   assets/lodestar-demo.gif
#
# Modes (the app reads .env on startup — no env is set in this tape so the GIF stays clean):
#   • LIVE  (impressive): set TEST_MODE=false + ANTHROPIC_API_KEY in .env. The embedding model
#                         is already cached in .models/, so only Claude is called.
#   • OFFLINE (fast/free): set TEST_MODE=true in .env — instant, deterministic, mock answer.
#
# Windows note: if `Set Shell "bash"` misbehaves, change it to:  Set Shell "powershell"
# Install vhs:  winget install charmbracelet.vhs   (or: scoop install vhs / go install)

Output assets/lodestar-demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 1200
Set Height 760
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 55ms

# 1) Launch the agentic CLI (load .env, build the agent — embeddings load from .models/ cache)
Type "uv run lodestar"
Sleep 600ms
Enter
Sleep 6s

# 2) Ask a focused question (a short prompt keeps the answer — and the GIF — tight)
Type "Briefly: where should an HBCU STEM student start finding scholarships?"
Sleep 600ms
Enter
Sleep 18s

# 3) Exit cleanly
Type "quit"
Sleep 400ms
Enter
Sleep 2s
