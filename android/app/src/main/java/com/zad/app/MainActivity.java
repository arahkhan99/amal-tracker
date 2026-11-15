package com.zad.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugin (not from npm): the home-screen widget bridge. Must be registered before super.onCreate.
        registerPlugin(ZadWidgetsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
