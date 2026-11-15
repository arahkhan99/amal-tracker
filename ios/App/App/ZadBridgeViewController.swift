import UIKit
import Capacitor

/// The app's web view controller: Capacitor's, plus the local ZadWidgets plugin.
class ZadBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ZadWidgetsPlugin())
    }
}
