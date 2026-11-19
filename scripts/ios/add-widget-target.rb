#!/usr/bin/env ruby

# Adds the ZadWidget widget extension target to ios/App/App.xcodeproj, so the widgets, the lock-screen widgets
# and the iOS 18 Control are built and shipped inside App.app without anyone opening Xcode on a Mac.
# The sources are already on disk in ios/App/ZadWidget/ (see docs/build/widgets.md).
#
# Run by .github/workflows/ios.yml on the GitHub Mac before every build. It can also be run on any Mac:
#   gem install xcodeproj && ruby scripts/ios/add-widget-target.rb [path/to/App.xcodeproj]
#
# Idempotent: if the ZadWidget target already exists, its settings are left alone and only the wiring
# (embed phase, target dependency, App entitlements) is checked and completed. A second run changes nothing.

require 'xcodeproj'

ROOT = File.expand_path('../..', __dir__)
PROJECT_PATH = File.expand_path(ARGV[0] || File.join(ROOT, 'ios', 'App', 'App.xcodeproj'))
SRC_ROOT = File.dirname(PROJECT_PATH) # ios/App: the project's main group and the base of every path below

APP_TARGET = 'App'
WIDGET = 'ZadWidget'
WIDGET_DIR = 'ZadWidget' # relative to ios/App
WIDGET_SOURCES = %w[ZadWidget.swift WidgetModel.swift].freeze
WIDGET_INFO_PLIST = 'Info.plist'
WIDGET_ENTITLEMENTS = 'ZadWidget.entitlements'
APP_ENTITLEMENTS = 'App/App.entitlements' # relative to ios/App
DEPLOYMENT_TARGET = '16.0'
APP_GROUP = 'group.com.zad.app'
FRAMEWORKS = %w[WidgetKit SwiftUI AppIntents].freeze
EMBED_PHASE_NAME = 'Embed Foundation Extensions'
PLUGINS_SUBFOLDER_SPEC = '13' # PBXCopyFilesBuildPhase destination "PlugIns"

def log(msg)
  puts "[add-widget-target] #{msg}"
end

def fail!(msg)
  warn "[add-widget-target] ERROR: #{msg}"
  exit 1
end

# The one value a setting has across all of the target's configurations (nil when unset, error when they differ).
def single_setting(target, key)
  values = target.build_configurations.map { |c| c.build_settings[key] }.compact.uniq
  fail!("#{target.name} has different #{key} per configuration: #{values.inspect}") if values.size > 1
  values.first
end

def app_group_in?(entitlements_path)
  groups = Xcodeproj::Plist.read_from_path(entitlements_path)['com.apple.security.application-groups']
  Array(groups).include?(APP_GROUP)
end

def find_or_add_file_ref(group, path, source_tree = :group)
  group.files.find { |f| f.path == path } || group.new_reference(path, source_tree)
end

# --- Checks before touching anything -------------------------------------------------------------------------

fail!("project not found: #{PROJECT_PATH}") unless File.directory?(PROJECT_PATH)

[*WIDGET_SOURCES, WIDGET_INFO_PLIST, WIDGET_ENTITLEMENTS].each do |f|
  path = File.join(SRC_ROOT, WIDGET_DIR, f)
  fail!("missing #{path}") unless File.file?(path)
end
app_entitlements_path = File.join(SRC_ROOT, APP_ENTITLEMENTS)
fail!("missing #{app_entitlements_path}") unless File.file?(app_entitlements_path)
fail!("#{WIDGET_ENTITLEMENTS} has no App Group #{APP_GROUP}") unless app_group_in?(File.join(SRC_ROOT, WIDGET_DIR, WIDGET_ENTITLEMENTS))
fail!("#{APP_ENTITLEMENTS} has no App Group #{APP_GROUP}") unless app_group_in?(app_entitlements_path)

log "xcodeproj #{Xcodeproj::VERSION}, project #{PROJECT_PATH}"
project = Xcodeproj::Project.open(PROJECT_PATH)

app = project.native_targets.find { |t| t.name == APP_TARGET }
fail!("no #{APP_TARGET} target in the project") unless app

app_bundle_id = single_setting(app, 'PRODUCT_BUNDLE_IDENTIFIER')
fail!("cannot read the App's bundle id (got #{app_bundle_id.inspect})") if app_bundle_id.nil? || app_bundle_id.include?('$')
widget_bundle_id = "#{app_bundle_id}.#{WIDGET}"

changed = false

# --- The widget extension target ------------------------------------------------------------------------------

widget = project.native_targets.find { |t| t.name == WIDGET }
if widget
  log "target #{WIDGET} already exists; its settings are left as they are"
else
  log "adding target #{WIDGET} (#{widget_bundle_id}, iOS #{DEPLOYMENT_TARGET})"
  widget = project.new_target(:app_extension, WIDGET, :ios, DEPLOYMENT_TARGET, nil, :swift)

  # Files: a ZadWidget group pointing at ios/App/ZadWidget. Only the Swift files go in a build phase; the
  # Info.plist and the entitlements are used through build settings and must not be copied as resources.
  group = project.main_group[WIDGET] || project.main_group.new_group(WIDGET, WIDGET_DIR)
  source_refs = WIDGET_SOURCES.map { |f| find_or_add_file_ref(group, f) }
  widget.add_file_references(source_refs)
  find_or_add_file_ref(group, WIDGET_INFO_PLIST)
  find_or_add_file_ref(group, WIDGET_ENTITLEMENTS)

  # System frameworks, referenced the way Xcode does (relative to the SDK, so any Xcode version finds them).
  FRAMEWORKS.each do |name|
    ref = find_or_add_file_ref(project.frameworks_group, "System/Library/Frameworks/#{name}.framework", :sdk_root)
    widget.frameworks_build_phase.add_file_reference(ref, true)
  end

  app_configs = app.build_configurations.to_h { |c| [c.name, c.build_settings] }
  widget.build_configurations.each do |config|
    s = config.build_settings
    app_s = app_configs[config.name] || app_configs['Release'] || {}
    # Inherit signing identity from the project, like the App target (automatic signing picks the certificate).
    s.delete_if { |key, _| key == 'ENABLE_BITCODE' || key.start_with?('CODE_SIGN_IDENTITY') }
    s.merge!(
      'PRODUCT_NAME' => '$(TARGET_NAME)',
      'PRODUCT_BUNDLE_IDENTIFIER' => widget_bundle_id,
      'INFOPLIST_FILE' => "#{WIDGET_DIR}/#{WIDGET_INFO_PLIST}",
      'GENERATE_INFOPLIST_FILE' => 'NO',
      'CODE_SIGN_ENTITLEMENTS' => "#{WIDGET_DIR}/#{WIDGET_ENTITLEMENTS}",
      'CODE_SIGN_STYLE' => 'Automatic',
      'SDKROOT' => 'iphoneos',
      'IPHONEOS_DEPLOYMENT_TARGET' => DEPLOYMENT_TARGET,
      'TARGETED_DEVICE_FAMILY' => app_s['TARGETED_DEVICE_FAMILY'] || '1',
      'SWIFT_VERSION' => '5.0',
      'CLANG_ENABLE_MODULES' => 'YES',
      'SWIFT_EMIT_LOC_STRINGS' => 'YES',
      # An extension is installed inside the app, never on its own: without this the archive is a
      # "Generic Xcode Archive" and the App Store export fails.
      'SKIP_INSTALL' => 'YES',
      'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks'],
      # The extension's versions must equal the app's (App Store validation). CI overrides both on the
      # command line for every target, so they stay equal there too.
      'MARKETING_VERSION' => app_s['MARKETING_VERSION'] || '1.0',
      'CURRENT_PROJECT_VERSION' => app_s['CURRENT_PROJECT_VERSION'] || '1'
    )
    s['DEVELOPMENT_TEAM'] = app_s['DEVELOPMENT_TEAM'] if app_s['DEVELOPMENT_TEAM']
    if config.name == 'Debug'
      s['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = 'DEBUG'
      s['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
    else
      s['SWIFT_COMPILATION_MODE'] = 'wholemodule'
      s['SWIFT_OPTIMIZATION_LEVEL'] = '-O'
    end
  end

  target_attributes = (project.root_object.attributes['TargetAttributes'] ||= {})
  target_attributes[widget.uuid] ||= { 'CreatedOnToolsVersion' => '16.0', 'ProvisioningStyle' => 'Automatic' }
  changed = true
end

product = widget.product_reference
fail!("#{WIDGET} has no product reference") unless product

# --- Embed ZadWidget.appex in App.app/PlugIns -----------------------------------------------------------------

embed = app.copy_files_build_phases.find { |p| p.dst_subfolder_spec == PLUGINS_SUBFOLDER_SPEC }
unless embed
  log "adding the \"#{EMBED_PHASE_NAME}\" phase to #{APP_TARGET}"
  embed = app.new_copy_files_build_phase(EMBED_PHASE_NAME)
  embed.dst_subfolder_spec = PLUGINS_SUBFOLDER_SPEC
  embed.dst_path = ''
  changed = true
end
unless embed.files_references.include?(product)
  log "embedding #{product.path} in #{APP_TARGET}"
  build_file = embed.add_file_reference(product, true)
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  changed = true
end

# --- Build ZadWidget before App -------------------------------------------------------------------------------

unless app.dependencies.any? { |d| d.target == widget }
  log "making #{APP_TARGET} depend on #{WIDGET}"
  app.add_dependency(widget)
  changed = true
end

# --- App entitlements (App Group shared with the widget, plus Sign in with Apple) ---------------------------

app.build_configurations.each do |config|
  current = config.build_settings['CODE_SIGN_ENTITLEMENTS']
  next if current == APP_ENTITLEMENTS
  if current && !current.empty?
    log "NOTE: #{APP_TARGET} (#{config.name}) uses #{current}; it must also list #{APP_GROUP}"
    next
  end
  log "setting #{APP_TARGET} (#{config.name}) CODE_SIGN_ENTITLEMENTS = #{APP_ENTITLEMENTS}"
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = APP_ENTITLEMENTS
  changed = true
end
app_group = project.main_group[APP_TARGET]
if app_group && app_group.files.none? { |f| f.path == File.basename(APP_ENTITLEMENTS) }
  app_group.new_reference(File.basename(APP_ENTITLEMENTS))
  changed = true
end

# --- Save and check -------------------------------------------------------------------------------------------

if changed
  project.save
  log 'project saved'
else
  log 'nothing to change'
end

check = Xcodeproj::Project.open(PROJECT_PATH)
c_app = check.native_targets.find { |t| t.name == APP_TARGET }
c_widget = check.native_targets.find { |t| t.name == WIDGET }
problems = []
problems << "no #{WIDGET} target" unless c_widget
if c_widget
  problems << "#{WIDGET} is not an app extension" unless c_widget.product_type == 'com.apple.product-type.app-extension'
  sources = c_widget.source_build_phase.files_references.map { |f| f&.path }
  WIDGET_SOURCES.each { |f| problems << "#{f} is not in #{WIDGET} Sources" unless sources.include?(f) }
  problems << "#{APP_TARGET} does not depend on #{WIDGET}" unless c_app.dependencies.any? { |d| d.target == c_widget }
  embedded = c_app.copy_files_build_phases.any? do |p|
    p.dst_subfolder_spec == PLUGINS_SUBFOLDER_SPEC && p.files_references.include?(c_widget.product_reference)
  end
  problems << "#{WIDGET}.appex is not embedded in #{APP_TARGET}" unless embedded
  c_widget.build_configurations.each do |config|
    s = config.build_settings
    log "#{WIDGET} #{config.name}: #{s['PRODUCT_BUNDLE_IDENTIFIER']}, iOS #{s['IPHONEOS_DEPLOYMENT_TARGET']}, " \
        "#{s['INFOPLIST_FILE']}, #{s['CODE_SIGN_ENTITLEMENTS']}"
  end
end
fail!(problems.join('; ')) unless problems.empty?
log 'ok'
