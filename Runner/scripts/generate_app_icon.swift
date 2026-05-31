import AppKit

let rootDirectory = URL(fileURLWithPath: CommandLine.arguments[1])
let assetsDirectory = rootDirectory.appendingPathComponent("Assets", isDirectory: true)
let fileManager = FileManager.default

try fileManager.createDirectory(at: assetsDirectory, withIntermediateDirectories: true)

func drawRectangleMark(in rect: CGRect) {
    let bars = [
        CGRect(x: rect.minX + rect.width * 0.22, y: rect.minY + rect.height * 0.67, width: rect.width * 0.68, height: rect.height * 0.16),
        CGRect(x: rect.minX + rect.width * 0.36, y: rect.minY + rect.height * 0.42, width: rect.width * 0.46, height: rect.height * 0.16),
        CGRect(x: rect.minX + rect.width * 0.10, y: rect.minY + rect.height * 0.17, width: rect.width * 0.58, height: rect.height * 0.16)
    ]

    for bar in bars {
        NSBezierPath(roundedRect: bar, xRadius: bar.height / 2, yRadius: bar.height / 2).fill()
    }
}

func appIcon(size: CGFloat) -> NSImage {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()

    let bounds = CGRect(x: 0, y: 0, width: size, height: size)
    NSColor.clear.setFill()
    NSBezierPath(rect: bounds).fill()

    let radius = size * 0.215
    let clipPath = NSBezierPath(roundedRect: bounds, xRadius: radius, yRadius: radius)
    clipPath.addClip()

    let base = NSGradient(colorsAndLocations:
        (NSColor(calibratedRed: 0.135, green: 0.145, blue: 0.165, alpha: 1), 0.00),
        (NSColor(calibratedRed: 0.070, green: 0.076, blue: 0.092, alpha: 1), 0.48),
        (NSColor(calibratedRed: 0.018, green: 0.020, blue: 0.030, alpha: 1), 1.00)
    )
    base?.draw(in: bounds, angle: -38)

    let coolWash = NSGradient(colorsAndLocations:
        (NSColor(calibratedRed: 0.22, green: 0.30, blue: 0.62, alpha: 0.16), 0.00),
        (NSColor(calibratedRed: 0.08, green: 0.16, blue: 0.22, alpha: 0.08), 0.52),
        (NSColor(calibratedRed: 0.02, green: 0.04, blue: 0.06, alpha: 0.00), 1.00)
    )
    coolWash?.draw(in: bounds, angle: -28)

    NSColor(calibratedWhite: 1, alpha: 0.96).setFill()
    drawRectangleMark(in: CGRect(x: size * 0.235, y: size * 0.305, width: size * 0.53, height: size * 0.39))

    let innerStroke = NSBezierPath(roundedRect: bounds.insetBy(dx: size * 0.018, dy: size * 0.018), xRadius: radius * 0.92, yRadius: radius * 0.92)
    NSColor(calibratedWhite: 1, alpha: 0.085).setStroke()
    innerStroke.lineWidth = size * 0.012
    innerStroke.stroke()

    image.unlockFocus()
    return image
}

func writePNG(_ image: NSImage, to url: URL) throws {
    guard
        let tiff = image.tiffRepresentation,
        let bitmap = NSBitmapImageRep(data: tiff),
        let data = bitmap.representation(using: .png, properties: [:])
    else {
        throw NSError(domain: "OpenArgosIconGenerator", code: 1)
    }

    try data.write(to: url)
}

let icon = appIcon(size: 1024)
try writePNG(icon, to: assetsDirectory.appendingPathComponent("AppIcon.png"))
