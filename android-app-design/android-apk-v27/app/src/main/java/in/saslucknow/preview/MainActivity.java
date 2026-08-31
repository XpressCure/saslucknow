package in.saslucknow.preview;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public final class MainActivity extends Activity {
    private static final String APP_URL = "https://saslucknow.in/mobile-app/sas-lucknow-android-redesign-preview-v49.html?member-interface-v17&level-one-launch-v45&darshan-functional-v47&release-gating-v48&darshan-menu-open-v30";

    private WebView webView;
    private OnBackInvokedCallback backInvokedCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(4, 45, 53));
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        FrameLayout rootView = new FrameLayout(this);
        rootView.setBackgroundColor(Color.rgb(4, 45, 53));
        rootView.addView(webView);
        rootView.setOnApplyWindowInsetsListener((view, insets) -> {
            FrameLayout.LayoutParams layoutParams =
                    (FrameLayout.LayoutParams) webView.getLayoutParams();
            layoutParams.topMargin = insets.getSystemWindowInsetTop();
            layoutParams.bottomMargin = insets.getSystemWindowInsetBottom();
            webView.setLayoutParams(layoutParams);
            return insets;
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.addJavascriptInterface(new CertificateBridge(), "SasAndroid");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                String path = uri.getPath();
                if (!"GET".equalsIgnoreCase(request.getMethod())
                        || host == null
                        || path == null
                        || !(host.equals("saslucknow.in") || host.equals("www.saslucknow.in"))
                        || !path.startsWith("/mobile-app/")) {
                    return null;
                }

                String assetPath = path.substring(1);
                try {
                    InputStream stream = getAssets().open(assetPath);
                    return new WebResourceResponse(
                            mimeTypeFor(path),
                            isTextAsset(path) ? "UTF-8" : null,
                            stream);
                } catch (IOException missingBundledAsset) {
                    return null;
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if (host != null && (host.equals("saslucknow.in")
                        || host.equals("www.saslucknow.in"))) {
                    return false;
                }
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }
        });

        setContentView(rootView);
        rootView.requestApplyInsets();
        webView.loadUrl(APP_URL);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backInvokedCallback = this::handleAppBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    backInvokedCallback);
        }
    }

    @Override
    public void onBackPressed() {
        handleAppBack();
    }

    private void handleAppBack() {
        if (webView == null) {
            moveTaskToBack(true);
            return;
        }
        webView.evaluateJavascript(
                "(function(){return Boolean(window.sasHandleAndroidBack&&window.sasHandleAndroidBack());})()",
                handled -> {
                    if ("true".equals(handled)) return;
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        moveTaskToBack(true);
                    }
                });
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && backInvokedCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backInvokedCallback);
            backInvokedCallback = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private static boolean isTextAsset(String path) {
        return path.endsWith(".html") || path.endsWith(".js") || path.endsWith(".css");
    }

    private static String mimeTypeFor(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    private final class CertificateBridge {
        @JavascriptInterface
        public void shareText(String subject, String text) {
            runOnUiThread(() -> {
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("text/plain");
                shareIntent.putExtra(Intent.EXTRA_SUBJECT, subject);
                shareIntent.putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(shareIntent, "Share certificate"));
            });
        }

        @JavascriptInterface
        public void saveCertificate(String dataUrl, String requestedFileName) {
            String fileName = requestedFileName == null
                    ? "next-human-challenge-certificate.png"
                    : requestedFileName.replaceAll("[^a-zA-Z0-9._-]", "-");
            try {
                int comma = dataUrl == null ? -1 : dataUrl.indexOf(',');
                if (comma < 0) throw new IllegalArgumentException("Missing certificate image data");
                byte[] imageBytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                    values.put(MediaStore.Downloads.MIME_TYPE, "image/png");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    values.put(MediaStore.Downloads.IS_PENDING, 1);
                    Uri item = getContentResolver().insert(
                            MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (item == null) throw new IllegalStateException("Could not create download");
                    try (OutputStream output = getContentResolver().openOutputStream(item)) {
                        if (output == null) throw new IllegalStateException("Could not open download");
                        output.write(imageBytes);
                    } catch (Exception error) {
                        getContentResolver().delete(item, null, null);
                        throw error;
                    }
                    values.clear();
                    values.put(MediaStore.Downloads.IS_PENDING, 0);
                    getContentResolver().update(item, values, null, null);
                } else {
                    File directory = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
                    if (directory == null) throw new IllegalStateException("Storage is unavailable");
                    if (!directory.exists() && !directory.mkdirs()) {
                        throw new IllegalStateException("Could not create certificate folder");
                    }
                    try (OutputStream output =
                                 new FileOutputStream(new File(directory, fileName))) {
                        output.write(imageBytes);
                    }
                }
                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Certificate saved in Downloads",
                        Toast.LENGTH_LONG).show());
            } catch (Exception error) {
                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Certificate could not be saved",
                        Toast.LENGTH_LONG).show());
            }
        }
    }
}
