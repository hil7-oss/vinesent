import os

file_path = "fastapi_app/routers/content/routes.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_code = '        if key in allowed:'
new_code = '        if key in allowed or key.startswith("extra_"):'

if old_code in content:
    new_content = content.replace(old_code, new_code)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully updated routes.py")
else:
    print("Could not find old_code in routes.py")
    # Let's try to see why it fails
    print(f"Content around 64: {content[content.find('allowed ='):content.find('return _write_content')]}")
