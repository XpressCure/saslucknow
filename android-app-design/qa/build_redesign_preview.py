from __future__ import annotations

import html
import shutil
from pathlib import Path


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "sas-lucknow-android-redesign-source.html"
OUTPUTS = (
    HERE / "sas-lucknow-android-redesign-preview.html",
    HERE.parent.parent / "public" / "mobile-app" / "sas-lucknow-android-redesign-preview.html",
)


inner = html.escape(SOURCE.read_text(encoding="utf-8"), quote=True)

outer = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com; style-src 'unsafe-inline' blob: data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com; img-src 'self' blob: data: https://i.ytimg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com; font-src blob: data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com; media-src 'self' blob: data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com; worker-src blob:; connect-src 'self' http://127.0.0.1:4193 https://www.saslucknow.in; frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>Sas Lucknow Android Redesign</title>
<script>if([...new URLSearchParams(window.location.search).keys()].some(key=>key.startsWith('member-interface-v')))document.documentElement.classList.add('member-interface')</script>
<style>:root{{color-scheme:light dark;background:light-dark(rgb(255 255 255), rgb(24 24 24))}}html,body{{margin:0}}body{{box-sizing:border-box;padding:1rem;background:inherit}}iframe{{display:block;width:100%;height:calc(100vh - 2rem);margin:0 auto;border:0}}html.member-interface,html.member-interface body{{height:100%}}html.member-interface body{{padding:0;background:#fff}}html.member-interface iframe{{height:100dvh}}</style>
</head>
<body>
<iframe id="sas-preview-frame" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" title="Sas Lucknow Android Redesign" srcdoc="{inner}"></iframe>
<script src="bharat-uday-mobile-levels.js?all-levels-v1"></script>
<script src="sas-mobile-challenge-v48.js?challenge-video-replay-v49"></script>
<script>
  window.sasHandleAndroidBack = () => {{
    const previewFrame = document.getElementById('sas-preview-frame');
    const handler = previewFrame?.contentWindow?.sasHandleSystemBack;
    return typeof handler === 'function' ? handler() === true : false;
  }};

  if ([...new URLSearchParams(window.location.search).keys()].some(key => key.startsWith('member-interface-v'))) {{
    const previewFrame = document.getElementById('sas-preview-frame');
    const applyMemberInterface = () => {{
      const previewDocument = previewFrame?.contentDocument;
      if (!previewDocument?.body) return;
      let deviceStyle = previewDocument.getElementById('sas-member-interface-style');
      if (!deviceStyle) {{
        deviceStyle = previewDocument.createElement('style');
        deviceStyle.id = 'sas-member-interface-style';
        deviceStyle.textContent = `
          html, body {{ min-height: 100%; background: #fff; }}
          #sas-app-redesign .sas-phone {{
            width: 100%;
            min-height: 100dvh;
            margin: 0;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }}
          #sas-app-redesign .sas-board-controls,
          #sas-app-redesign .sas-status {{ display: none !important; }}
          #sas-app-redesign .sas-screen {{ min-height: 100dvh; }}
        `;
        previewDocument.head.appendChild(deviceStyle);
      }}
      window.installSasMobileChallenge?.(previewDocument);
    }};
    previewFrame.addEventListener('load', applyMemberInterface);
    applyMemberInterface();
  }}
</script>
</body>
</html>
'''

for output in OUTPUTS:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(outer, encoding="utf-8")
    print(f"wrote {output} ({output.stat().st_size} bytes)")

mobile_bundle = OUTPUTS[1].parent
for asset_name in ("bharat-uday-mobile-levels.js", "sas-mobile-challenge-v48.js"):
    shutil.copy2(HERE / asset_name, mobile_bundle / asset_name)
    print(f"synced {mobile_bundle / asset_name}")
