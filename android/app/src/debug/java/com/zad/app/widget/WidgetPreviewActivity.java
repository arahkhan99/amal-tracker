package com.zad.app.widget;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.RemoteViews;
import android.widget.ScrollView;
import android.widget.TextView;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * Debug builds only (src/debug): draws the real widget RemoteViews at chosen sizes, to check the layouts when a
 * widget is stretched or shrunk, without placing widgets by hand. Not in release builds (the test builds and the
 * stores are release builds).
 *   adb shell run-as com.zad.app sh -c 'cat > files/snap.json' < snap.json
 *   adb shell am start -n com.zad.app/.widget.WidgetPreviewActivity --es sizes 110x110,250x110 --el now 1795641000000
 *       [--es kind auto|small|medium|large]
 */
public class WidgetPreviewActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        long now = getIntent().getLongExtra("now", System.currentTimeMillis());
        String sizes = getIntent().getStringExtra("sizes");
        if (sizes == null) sizes = "110x110,180x110,250x110,250x180,340x110,340x180,250x250,340x340";
        String kind = getIntent().getStringExtra("kind");
        if (kind == null) kind = "auto";
        String json = null;
        try {
            json = new String(Files.readAllBytes(new File(getFilesDir(), "snap.json").toPath()), StandardCharsets.UTF_8);
            WidgetStore.write(this, json);
        } catch (Exception ignored) { /* use whatever the app stored */ }
        WidgetModel m = WidgetModel.build(this, now, false);

        float d = getResources().getDisplayMetrics().density;
        int screen = (int) (getResources().getDisplayMetrics().widthPixels / d) - 16;
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding((int) (8 * d), (int) (8 * d), (int) (8 * d), (int) (8 * d));
        col.setBackgroundColor(Color.rgb(96, 110, 120));
        LinearLayout row = null;
        int used = 0;
        for (String s : sizes.split(",")) {
            String[] wh = s.trim().split("x");
            int w = Integer.parseInt(wh[0]), h = Integer.parseInt(wh[1]);
            if (row == null || used + w + 10 > screen) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                col.addView(row);
                used = 0;
            }
            LinearLayout cell = new LinearLayout(this);
            cell.setOrientation(LinearLayout.VERTICAL);
            TextView label = new TextView(this);
            label.setText(s);
            label.setTextColor(Color.WHITE);
            label.setTextSize(10);
            cell.addView(label);
            FrameLayout box = new FrameLayout(this);
            RemoteViews rv = "auto".equals(kind)
                ? WidgetRenderer.forSize(this, m, json, w, h)
                : WidgetRenderer.render(this, WidgetRenderer.Size.valueOf(kind.toUpperCase()), m, json);
            View v = rv.apply(this, box);
            box.addView(v, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
            cell.addView(box, new LinearLayout.LayoutParams((int) (w * d), (int) (h * d)));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, (int) (10 * d), (int) (10 * d));
            row.addView(cell, lp);
            used += w + 10;
        }
        ScrollView sv = new ScrollView(this);
        sv.addView(col);
        setContentView(sv);
    }
}
