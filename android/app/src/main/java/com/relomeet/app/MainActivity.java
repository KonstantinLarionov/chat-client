package com.relomeet.app;

import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
  private static final int PERMISSION_REQUEST_CODE = 1;

  private final String[] permissions = new String[]{
    android.Manifest.permission.CAMERA,
    android.Manifest.permission.RECORD_AUDIO
  };
  private void requestPermissionsIfNeeded() {
    List<String> listPermissionsNeeded = new ArrayList<>();

    for (String permission : permissions) {
      if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
        listPermissionsNeeded.add(permission);
      }
    }

    if (!listPermissionsNeeded.isEmpty()) {
      requestPermissions(listPermissionsNeeded.toArray(new String[0]), PERMISSION_REQUEST_CODE);
    } else {
      onPermissionsGranted();
    }
  }
  private void onPermissionsGranted() {
    // Здесь запускаешь WebRTC / VideoChatService / камеру
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    requestPermissionsIfNeeded();
    this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
      @Override
      public void onPermissionRequest(final PermissionRequest request) {
        runOnUiThread(() -> {
          request.grant(request.getResources());
        });
      }
    });
  }
}
