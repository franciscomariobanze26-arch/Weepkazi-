package com.weepkazi.app;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Make the app edge-to-edge for a modern professional look
        getWindow().setNavigationBarColor(android.graphics.Color.WHITE);
        getWindow().setStatusBarColor(android.graphics.Color.parseColor("#0066FF"));

        // Keep screen on while app is active (useful for chat/service browsing)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
