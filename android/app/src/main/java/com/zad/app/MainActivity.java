package com.zad.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugin (not from npm): the home-screen widget bridge. Must be registered before super.onCreate.
        registerPlugin(ZadWidgetsPlugin.class);
        forgetHandledLaunch(savedInstanceState);
        super.onCreate(savedInstanceState);
    }

    /**
     * Capacitor hands the intent that started this activity to every plugin again each time the activity is created
     * (BridgeActivity.load calls onNewIntent(getIntent())). When the activity is only being re-created (Android ended
     * the app in the background and it comes back, or it is reopened from Recents), that intent was handled the first
     * time: a notification button ("On time") would log the prayer again over a later change in the app, and a widget
     * link would reopen its sheet. So such a re-delivered intent loses the notification action and the link.
     */
    private void forgetHandledLaunch(Bundle savedInstanceState) {
        Intent i = getIntent();
        if (i == null) return;
        boolean again = savedInstanceState != null || (i.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0;
        if (!again) return;
        // @capacitor/local-notifications' intent extras (LocalNotificationManager: the misspelling is theirs)
        i.removeExtra("LocalNotificationId");
        i.removeExtra("LocalNotificationUserAction");
        i.removeExtra("LocalNotficationObject");
        if (Intent.ACTION_VIEW.equals(i.getAction())) {
            i.setAction(Intent.ACTION_MAIN);
            i.setData(null);
        }
        setIntent(i);
    }
}
