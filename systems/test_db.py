from server import db, Group, System

db.create_all()

s1 = System()
s2 = System()
g1 = Group(name="Group 1")
g2 = Group(name="Group 2")
g3 = Group(name="Group 3")

g1.systems.append(s1)
g1.systems.append(s2)
g1.groups.append(g2)
g1.groups.append(g3)

db.session.add(s1)
db.session.add(s2)
db.session.add(g1)
db.session.add(g2)


db.session.commit()

for group in Group.query.all():
    print(group.name, group.parent, group.groups, group.systems)
