import 'package:flutter_test/flutter_test.dart';
import 'package:alarab_student_app/main.dart';

void main() {
  testWidgets('App launches without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const AlarabStudentApp());
    // Just verify the app widget tree is created
    expect(find.byType(AlarabStudentApp), findsOneWidget);
  });
}
