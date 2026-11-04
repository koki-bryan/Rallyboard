import os
import tempfile
import unittest

file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
file.close()
os.environ['DATABASE_URL'] = 'sqlite:///' + file.name
import main

class FlowTests(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        main.engine.dispose()
        os.unlink(file.name)

    def setUp(self):
        main.Base.metadata.drop_all(main.engine)
        main.Base.metadata.create_all(main.engine)
        self.db = main.SessionLocal()
        self.players = [main.User(name=n, email=n.lower()+'@example.com', password_hash='test') for n in ('Floyd','Sean','Coach')]
        self.db.add_all(self.players)
        self.db.commit()
        self.event = main.Event(name='Club', best_of=5, created_by=self.players[2].id)
        self.db.add(self.event)
        self.db.commit()
        self.match = main.Match(event_id=self.event.id, player1_id=self.players[0].id, player2_id=self.players[1].id)
        self.db.add(self.match)
        self.db.commit()

    def tearDown(self): self.db.close()

    def test_score_validation_and_standings(self):
        with self.assertRaises(main.HTTPException):
            main.validate_result(main.ResultIn(sets=[(11,2),(12,9),(11,5)]),self.match,5)
        result = main.ResultIn(sets=[(11,2),(9,11),(11,5),(12,10)])
        self.assertEqual(main.validate_result(result,self.match,5),self.players[0].id)
        main.save_result(self.db,self.match,result,self.players[0],'before_submission')
        rows = main.standings([p.id for p in self.players[:2]],{p.id:p.name for p in self.players[:2]},[self.match])
        self.assertEqual(rows[0]['name'],'Floyd')
        self.assertEqual(rows[0]['points_won'],43)
        self.assertEqual(self.event.status,'complete')
        main.save_result(self.db,self.match,main.ResultIn(sets=[(2,11),(4,11),(5,11)]),self.players[2],'before_correction')
        self.assertEqual(self.match.submitted_by,self.players[0].id)
        self.assertEqual(main.standings([p.id for p in self.players[:2]],{p.id:p.name for p in self.players[:2]},[self.match])[0]['name'],'Sean')
        self.assertGreater(len(self.db.query(main.Audit).all()),2)

if __name__ == '__main__': unittest.main()
